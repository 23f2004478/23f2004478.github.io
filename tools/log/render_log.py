"""Step 6: entries + /log/data/*.json -> /log/ pages, feeds, home card, nav link.

Deterministic. Reads the site shell (sprite, header, footer) from /work/index.html so the
log pages carry the same chrome as the rest of the site.
Usage: python3 tools/log/render_log.py
"""
import json
import re
import sys
from datetime import date
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import svg as S  # noqa: E402
from common import (DATA, LOG, MONTHS_LONG, SITE, SITE_URL, TAG_RE, TZ, entry_url,  # noqa: E402
                    human_date, load_entries, read_json)

PERSON = SITE_URL + "/#person"
STATUS = {"shipped": "Shipped", "in progress": "In progress", "paused": "Paused", "retired": "Retired"}
CATEGORY = {"infra": "Infrastructure", "capability": "Capability", "site": "Site", "process": "Process"}
FIELDS = [("what_changed", "What changed"), ("why_it_matters", "Why it matters")]
NAV_LI = '<li><a href="/log/">Log</a></li>'


def esc(s):
    return escape(str(s), quote=True)


# ------------------------------------------------------------------ shell

def shell():
    s = (SITE / "work/index.html").read_text(encoding="utf-8")
    b = s.index("<body>") + len("<body>")
    m = s.index('<main id="main">')
    f = s.index("</main>") + len("</main>")
    top = s[b:m]
    top = top.replace(' aria-current="page"', "")
    top = add_nav(top)
    top = top.replace('<a href="/log/">Log</a>', '<a href="/log/" aria-current="page">Log</a>')
    return top, s[f:]


def add_nav(html):
    if re.search(r'<li><a href="/log/"[^>]*>Log</a></li>', html):
        return html
    return re.sub(r'(<li><a href="/work/"[^>]*>Work</a></li>)', r"\1" + NAV_LI, html, count=1)


def head(title, desc, path, ld, extra=""):
    url = SITE_URL + path
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%(t)s</title>
<meta name="description" content="%(d)s">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="%(u)s">
<meta property="og:type" content="%(ogt)s">
<meta property="og:site_name" content="Krishnendu Biswas">
<meta property="og:url" content="%(u)s">
<meta property="og:title" content="%(t)s">
<meta property="og:description" content="%(d)s">
<meta property="og:image" content="https://krishnendu.me/og/og-home.svg">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Build log (RSS)" href="/log/feed.xml">
<link rel="alternate" type="application/feed+json" title="Build log (JSON Feed)" href="/log/feed.json">
<link rel="stylesheet" href="/styles.css">
<script src="/site.js" defer></script>
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<script type="application/ld+json">
%(ld)s
</script>%(x)s
</head>
<body>""" % {"t": esc(title), "d": esc(desc), "u": url, "ld": json.dumps(ld, indent=2, ensure_ascii=False),
             "x": extra, "ogt": "article" if path.count("/") > 3 else "website"}


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + p} for i, (n, p) in enumerate(items)]}


def page(path, title, desc, ld, main):
    top, foot = shell()
    html = head(title, desc, path, ld) + top + '<main id="main">' + main + "</main>" + foot
    out = SITE / path.strip("/") / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


# ------------------------------------------------------------------ text helpers

def tags_html(text, counter=None):
    # Visible mark is a CSS counter number (see .fn.src in styles.css), not the raw tag text,
    # so the inline citation reads as a small footnote instead of noise like "[K:t_...]".
    # The link points at this entry's own Sources list at the bottom of the same page. The
    # aria-label carries a plain sequential label, never the raw tag: the tag itself is kept
    # machine-readable only as the data-src attribute on that Sources list item.
    def sub(m):
        tag = "%s:%s" % (m.group(1), m.group(2))
        if counter is not None:
            counter[0] += 1
            lab = "Source %d" % counter[0]
        else:
            lab = "Source"
        return '<sup class="fn src"><a href="#%s" aria-label="%s"></a></sup>' % (
            anchor(tag), esc(lab))
    parts, last = [], 0
    for m in TAG_RE.finditer(text):
        parts.append(esc(text[last:m.start()].rstrip()))
        parts.append(sub(m))
        last = m.end()
    parts.append(esc(text[last:]))
    return "".join(parts)


def plain(text):
    return re.sub(r"\s+", " ", re.sub(r"\s*" + TAG_RE.pattern, "", text)).strip()


def anchor(tag):
    return "src-" + re.sub(r"[^A-Za-z0-9]+", "-", tag)


def first_sentence(text):
    t = plain(text)
    m = re.match(r"(.+?[.!?])(\s|$)", t)
    return m.group(1) if m else t


def iso_dt(d):
    return d + "T20:00:00" + TZ


# ------------------------------------------------------------------ figures

def figure(uid, wide, narrow, caption, rows, headers, cls=""):
    table = "".join("<tr><th scope=\"row\">%s</th>%s</tr>" % (esc(r[0]), "".join("<td>%s</td>" % esc(c) for c in r[1:]))
                    for r in rows)
    th = "".join('<th scope="col">%s</th>' % esc(h) for h in headers)
    return ('<figure class="fig %s">%s%s<figcaption>%s <button class="show-data" type="button" aria-expanded="false" '
            'aria-controls="%s-data" hidden>Show data</button></figcaption><div class="dtable sr-only" id="%s-data">'
            '<table><caption>%s</caption><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div></figure>'
            % (cls, wide, narrow, tags_html(caption), uid, uid, esc(plain(caption)), th, table))


def entry_figure(e, uid):
    d = e["diagram"]
    wide, narrow = S.TEMPLATES[d["template"]][0](d, uid)
    if d["template"] == "before_after":
        rows = [["Before", d["before_title"], ", ".join(d["before_items"])],
                ["After", d["after_title"], ", ".join(d["after_items"])],
                ["Change", d["arrow"], ""]]
        hdr = ["Side", "Where", "What ran there"]
    else:
        rows = [[str(i + 1), s, "Loop back to %s: %s" % (d["steps"][d["loop_to"]], d["loop_label"]) if i == d["loop_from"] else ""]
                for i, s in enumerate(d["steps"])]
        hdr = ["Step", "Name", "Return path"]
    return figure(uid, wide, narrow, d["caption"], rows, hdr, "entry-fig")


def thumb(e, uid):
    d = e["diagram"]
    return S.TEMPLATES[d["template"]][1](d, uid)


# ------------------------------------------------------------------ pages

def strip_html(strip):
    cells = []
    for c in strip["cells"]:
        v = c["value"]
        shown = S.thousands(v) if isinstance(v, int) else str(v)
        cells.append('<div><dt class="mono">%s</dt><dd><span class="lab">%s</span><span class="unit">%s</span></dd></div>'
                     % (esc(shown), esc(c["label"]), esc(c["unit"])))
    gen = strip["generated"]
    when = human_date(gen) if gen != "not measured" else "not measured"
    return ('<section class="wrap strip-sec" aria-labelledby="h-week"><h2 id="h-week" class="strip-h">This week'
            '<span class="muted"> &middot; %s days to %s</span></h2><dl class="strip">%s</dl>'
            '<p class="small muted strip-note">Counts from the build board and model call logs. Institute work is excluded. '
            '<a href="/log/sources/#counting">How these are counted</a></p></section>'
            % (strip["window_days"], esc(when), "".join(cells)))


def entry_rows(entries):
    out = []
    for e in entries:
        out.append('<li><div><h3><a href="%s">%s</a></h3><p>%s</p></div><span class="fact mono">%s</span></li>'
                   % (entry_url(e), esc(e["title"]), esc(first_sentence(e["what_changed"])), esc(human_date(e["date"]))))
    return '<ul class="rows" role="list">%s</ul>' % "".join(out)


def standing_figures(data):
    tp, tl, mm, hist = data["topology"], data["timeline"], data["modelmix"], data["modelmix_weeks"]
    out = []
    w, n = S.topology(tp, "lt")
    rows = [[tp["router"], "Routes messages and hands work to profiles"]] + [
        [p, "Domain profile (the builder agent that does scoped, approved work)" if p == "workhorse" else "Domain profile"]
        for p in tp["profiles"]]
    topo = figure("lt", w, n, "%s profiles, router included. Domain names only; one profile is shown as institute work, private."
                  % tp["count_including_router"], rows, ["Profile", "Role"], "topo-fig")
    w, n = S.timeline(tl, "ltl", tl["generated"], tl["days"])
    rows = [[d["date"], d["title"], S.CAT_LABEL[d["category"]]] for d in tl["ledger"]]
    tlf = figure("ltl", w, n, "Public ledger milestones in the last %d days, %d dots. Undated or private milestones are not drawn."
                 % (tl["days"], tl["dots"]), rows, ["Date", "Milestone", "Category"], "tl-fig")
    out.append('<div class="pair">%s%s</div>' % (topo, tlf))
    w, n = S.model_bars(mm, "lm")
    rows = [[m["name"], S.thousands(m["calls"]), m["share_pct"] + "%"] for m in mm["models"]]
    out.append(figure("lm", w, n, "Model calls in the %s-day window, by model, %s calls in total. Bars start at zero. Names are as logged, including fallback models. "
                      "Raw model ids are on the sources page."
                      % (mm["window_days"], S.thousands(mm["total_calls"])), rows, ["Model", "Calls", "Share"]))
    w, n = S.model_trend(hist, "lmt")
    rows = [[wk["end"], ", ".join("%s %s" % (k, S.thousands(v)) for k, v in sorted(wk["calls_by_name"].items(), key=lambda kv: -kv[1]))]
            for wk in hist["weeks"]]
    out.append(figure("lmt", w, n, "Model calls per week. Tracking started %s; weeks before that were not measured and are left out."
                      % human_date(hist["weeks"][0]["end"]), rows, ["Week ending", "Calls by model"]))
    return out


def render_index(entries, data):
    newest = entries[0] if entries else None
    figs = standing_figures(data)
    lead = ""
    if newest:
        lead = ('<p class="newest">Newest: <a href="%s">%s</a> <span class="mono muted">%s</span></p>'
                % (entry_url(newest), esc(newest["title"]), esc(human_date(newest["date"]))))
    main = ('<div class="wrap page-head log-head"><h1>Build log</h1>'
            '<p class="deck">What I build and run with agents, reviewed before publishing.</p>'
            '<p class="frame">Built on open-source <a href="https://github.com/NousResearch/hermes-agent" rel="noopener noreferrer">Hermes Agent</a>. '
            'I review every entry before it goes live. New entries on Wednesday and Sunday evenings.</p>%s</div>'
            % lead)
    main += strip_html(data["strip"])
    main += ('<section class="wrap" aria-labelledby="h-entries"><h2 id="h-entries">Entries</h2>%s'
             '<ul class="textlinks log-links"><li><a href="/log/archive/">All entries by month</a></li>'
             '<li><a href="/log/sources/">How I source these numbers</a></li><li><a href="/log/feed.xml">RSS feed</a></li>'
             '<li><a href="/log/feed.json">JSON Feed</a></li></ul></section>'
             % entry_rows(entries))
    main += ('<section class="wrap" aria-labelledby="h-estate"><h2 id="h-estate">The estate right now</h2>%s</section>'
             % "".join(figs))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Blog", "@id": SITE_URL + "/log/#blog", "url": SITE_URL + "/log/", "name": "Build log | Krishnendu Biswas",
         "description": "What I build and run with agents, reviewed before publishing.", "inLanguage": "en",
         "author": {"@id": PERSON}, "publisher": {"@id": PERSON}, "isPartOf": {"@id": SITE_URL + "/#website"},
         "blogPost": [{"@id": SITE_URL + entry_url(e) + "#post"} for e in entries],
         "breadcrumb": crumbs([("Home", "/"), ("Build log", "/log/")])}]}
    page("/log/", "Build log | Krishnendu Biswas",
         "What I build and run with agents, reviewed before publishing. Built on open-source Hermes Agent.", ld, main)


def render_entry(e, prev_e, next_e):
    url = entry_url(e)
    body = []
    counter = [0]
    for key, label in FIELDS:
        body.append('<h2 id="%s">%s</h2><p>%s</p>' % (key.replace("_", "-"), label, tags_html(e[key], counter)))
    body.append(entry_figure(e, "e-" + e["slug"][:6]))
    body.append('<h2 id="result">Result</h2><p>%s</p>' % tags_html(e["result"], counter))
    if e.get("lesson"):
        body.append('<h2 id="lesson">Lesson</h2><p>%s</p>' % tags_html(e["lesson"], counter))
    # The tag is kept as a data-src attribute (machine-readable for privacy_gate and the
    # number check) rather than printed in visible text; only the plain-language label shows.
    src = "".join('<li id="%s" data-src="%s">%s</li>' % (anchor(s["tag"]), esc(s["tag"]), esc(s["label"]))
                  for s in e["sources"])
    body.append('<h2 id="sources">Sources</h2><ul class="src-list">%s</ul><p class="small muted">Reviewed and approved by me before publishing. '
                '<a href="/log/sources/">How I source these numbers</a></p>' % src)
    pager = '<nav class="pager" aria-label="Log entries">'
    pager += ('<a href="%s"><svg class="icon flip" aria-hidden="true"><use href="#i-arr"/></svg> Older: %s</a>' % (entry_url(prev_e), esc(prev_e["title"]))
              if prev_e else '<a href="/log/"><svg class="icon flip" aria-hidden="true"><use href="#i-arr"/></svg> Build log</a>')
    pager += ('<a href="%s">Newer: %s <svg class="icon" aria-hidden="true"><use href="#i-arr"/></svg></a>' % (entry_url(next_e), esc(next_e["title"]))
              if next_e else '<a href="/log/archive/">All entries <svg class="icon" aria-hidden="true"><use href="#i-arr"/></svg></a>')
    pager += "</nav>"
    main = ('<article class="wrap entry-page"><nav class="crumb" aria-label="Breadcrumb"><a href="/log/">'
            '<svg class="icon flip" aria-hidden="true"><use href="#i-arr"/></svg> Build log</a></nav>'
            '<header class="page-head"><h1>%s</h1><p class="meta"><time datetime="%s">%s</time> &middot; %s &middot; %s</p></header>'
            '%s%s</article>' % (esc(e["title"]), e["date"], esc(human_date(e["date"])), STATUS[e["status"]],
                                CATEGORY[e["category"]], "".join(body), pager))
    desc = plain(e["what_changed"])
    desc = desc if len(desc) <= 155 else desc[:desc.rfind(" ", 0, 150)] + "..."
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "@id": SITE_URL + url + "#post", "url": SITE_URL + url, "headline": e["title"],
         "description": desc, "datePublished": iso_dt(e["date"]), "dateModified": iso_dt(e["date"]), "inLanguage": "en",
         "author": {"@id": PERSON}, "publisher": {"@id": PERSON}, "isPartOf": {"@id": SITE_URL + "/log/#blog"},
         "mainEntityOfPage": SITE_URL + url,
         "breadcrumb": crumbs([("Home", "/"), ("Build log", "/log/"), (e["title"], url)])}]}
    page(url, "%s | Build log" % e["title"], desc, ld, main)


def render_archive(entries):
    groups = {}
    for e in entries:
        groups.setdefault(e["date"][:7], []).append(e)
    parts = []
    for ym in sorted(groups, reverse=True):
        y, m = ym.split("-")
        items = "".join('<li><span class="mono when">%s</span> <a href="%s">%s</a></li>' % (esc(human_date(e["date"])), entry_url(e), esc(e["title"]))
                        for e in groups[ym])
        parts.append('<h2 id="m-%s">%s %s</h2><ul class="arch">%s</ul>' % (ym, MONTHS_LONG[int(m) - 1], y, items))
    main = ('<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/log/"><svg class="icon flip" aria-hidden="true">'
            '<use href="#i-arr"/></svg> Build log</a></nav><div class="page-head"><h1>All entries</h1>'
            '<p class="deck">Every build log entry, newest first, grouped by month.</p></div>%s</div>' % "".join(parts))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": SITE_URL + "/log/archive/#webpage", "url": SITE_URL + "/log/archive/",
         "name": "All entries | Build log", "author": {"@id": PERSON}, "isPartOf": {"@id": SITE_URL + "/log/#blog"},
         "breadcrumb": crumbs([("Home", "/"), ("Build log", "/log/"), ("All entries", "/log/archive/")])}]}
    page("/log/archive/", "All entries | Build log", "Every build log entry, newest first, grouped by month.", ld, main)


def render_sources(entries, data):
    tags = {}
    for e in entries:
        for s in e["sources"]:
            tags.setdefault(s["tag"], (s["label"], []))[1].append(e)
    rows = "".join('<li id="%s" data-src="%s">%s. Cited in: %s.</li>' % (
        anchor(t), esc(t), esc(lab), ", ".join('<a href="%s">%s</a>' % (entry_url(e), esc(e["title"])) for e in es))
        for t, (lab, es) in sorted(tags.items()))
    cells = "".join("<li><strong>%s</strong>: %s.</li>" % (esc(c["label"]), esc(c["unit"])) for c in data["strip"]["cells"])
    names = "".join("<li>%s is logged as <span class=\"mono\">%s</span>.</li>" % (esc(m["name"]), esc(m["id"]))
                    for m in data["modelmix"]["models"] if m["name"] != m["id"])
    main = ('<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/log/"><svg class="icon flip" aria-hidden="true">'
            '<use href="#i-arr"/></svg> Build log</a></nav><div class="page-head"><h1>How I source these numbers</h1>'
            '<p class="deck">Every number in an entry carries a tag that points to where it came from.</p></div>'
            '<h2 id="tags">Tag formats</h2><ul class="src-list">'
            '<li><span class="mono">G:</span> a milestone in my append-only ledger. Each milestone gets an ID when it happens, and the ID never changes.</li>'
            '<li><span class="mono">K:</span> a task card on the build board, where agents pick up work and I approve or return it.</li>'
            '<li><span class="mono">T:</span> one day of model call logs, counted per model.</li>'
            '<li><span class="mono">D:</span> one daily progress report. Used as a drafting hint, never quoted.</li></ul>'
            '<h2 id="counting">How the weekly figures are counted</h2><ul class="src-list">%s</ul>'
            '<p>A cell that has no source for the week shows &ldquo;not measured&rdquo; instead of zero. Institute work runs in a separate, private profile and is left out of every count.</p>'
            '<h2 id="models">Model names</h2><p>Charts use the model name. The id is what the call log records.</p><ul class="src-list">%s</ul>'
            '<h2 id="privacy">What never appears here</h2><p>Client names, institute work, money amounts, channel names, server addresses, ports and file paths. '
            'A script checks every page for these before I see the draft, and I check the rest by hand.</p>'
            '<h2 id="cited">Tags cited so far</h2><ul class="src-list">%s</ul></div>' % (cells, names, rows))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": SITE_URL + "/log/sources/#webpage", "url": SITE_URL + "/log/sources/",
         "name": "How I source these numbers | Build log", "author": {"@id": PERSON}, "isPartOf": {"@id": SITE_URL + "/log/#blog"},
         "breadcrumb": crumbs([("Home", "/"), ("Build log", "/log/"), ("Sources", "/log/sources/")])}]}
    page("/log/sources/", "How I source these numbers | Build log",
         "Tag formats, counting rules and privacy rules for the build log.", ld, main)


def entry_html_for_feed(e):
    d = e["diagram"]
    wide, _ = S.TEMPLATES[d["template"]][0](d, "f-" + e["slug"][:6])
    parts = ["<p><strong>%s</strong>: %s</p>" % (lab, esc(plain(e[k]))) for k, lab in FIELDS]
    parts.append(wide)
    parts.append("<p><strong>Result</strong>: %s</p>" % esc(plain(e["result"])))
    if e.get("lesson"):
        parts.append("<p><strong>Lesson</strong>: %s</p>" % esc(plain(e["lesson"])))
    parts.append("<p>Sources: %s</p>" % ", ".join(
        '<span data-src="%s">%s</span>' % (esc(s["tag"]), esc(s["label"])) for s in e["sources"]))
    return "".join(parts)


def rfc822(d):
    dt = date.fromisoformat(d)
    return "%s, %02d %s %d 20:00:00 +0530" % (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dt.weekday()], dt.day,
                                              ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.month - 1], dt.year)


def render_feeds(entries):
    items = []
    for e in entries:
        u = SITE_URL + entry_url(e)
        items.append("<item><title>%s</title><link>%s</link><guid isPermaLink=\"true\">%s</guid><pubDate>%s</pubDate>"
                     "<description>%s</description><content:encoded><![CDATA[%s]]></content:encoded></item>"
                     % (esc(e["title"]), u, u, rfc822(e["date"]), esc(plain(e["what_changed"])), entry_html_for_feed(e)))
    last = rfc822(entries[0]["date"]) if entries else rfc822(date.today().isoformat())
    rss = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" '
           'xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Build log | Krishnendu Biswas</title><link>%s/log/</link>'
           '<atom:link href="%s/log/feed.xml" rel="self" type="application/rss+xml"/>'
           '<description>What I build and run with agents, reviewed before publishing.</description><language>en</language>'
           '<lastBuildDate>%s</lastBuildDate>%s</channel></rss>\n' % (SITE_URL, SITE_URL, last, "".join(items)))
    (LOG / "feed.xml").write_text(rss, encoding="utf-8")
    jf = {"version": "https://jsonfeed.org/version/1.1", "title": "Build log | Krishnendu Biswas",
          "home_page_url": SITE_URL + "/log/", "feed_url": SITE_URL + "/log/feed.json",
          "description": "What I build and run with agents, reviewed before publishing.", "language": "en",
          "authors": [{"name": "Krishnendu Biswas", "url": SITE_URL + "/"}],
          "items": [{"id": SITE_URL + entry_url(e), "url": SITE_URL + entry_url(e), "title": e["title"],
                     "summary": plain(e["what_changed"]), "content_html": entry_html_for_feed(e),
                     "date_published": iso_dt(e["date"]), "tags": [e["category"], e["status"]]} for e in entries]}
    (LOG / "feed.json").write_text(json.dumps(jf, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


HOME_START, HOME_END = "<!-- build-log:start -->", "<!-- build-log:end -->"


def render_home_card(entries):
    p = SITE / "index.html"
    s = p.read_text(encoding="utf-8")
    s = re.sub(re.escape(HOME_START) + ".*?" + re.escape(HOME_END), "", s, flags=re.S)
    if entries:
        e = entries[0]
        card = ('%s<section class="section wrap" id="build-log" aria-labelledby="h-latest"><div class="latest">'
                '<div class="latest-txt"><h2 id="h-latest">Latest from the build log</h2>'
                '<p class="meta"><time datetime="%s">%s</time></p><h3><a href="%s">%s</a></h3><p>%s</p>'
                '<p><a href="/log/">All build log entries <svg class="icon" aria-hidden="true"><use href="#i-arr"/></svg></a></p></div>'
                '<a class="latest-fig" href="%s" tabindex="-1" aria-hidden="true">%s</a></div></section>%s'
                % (HOME_START, e["date"], esc(human_date(e["date"])), entry_url(e), esc(e["title"]),
                   esc(first_sentence(e["what_changed"])), entry_url(e), thumb(e, "hl"), HOME_END))
        i = s.index('id="agent-systems"')
        i = s.rindex("<section", 0, i)
        s = s[:i] + card + s[i:]
    p.write_text(s, encoding="utf-8")


def nav_everywhere():
    changed = []
    for p in sorted(SITE.rglob("*.html")):
        rel = p.relative_to(SITE).as_posix()
        if rel.startswith(("archive/", "tools/", ".git/")):
            continue
        s = p.read_text(encoding="utf-8")
        if 'id="navlist"' not in s or rel.startswith("log/"):
            continue
        n = add_nav(s)
        if n != s:
            p.write_text(n, encoding="utf-8")
            changed.append(rel)
    return changed


SM_START, SM_END = "<!-- build-log:start -->", "<!-- build-log:end -->"


def render_sitemap(entries):
    p = SITE / "sitemap.xml"
    s = p.read_text(encoding="utf-8")
    s = re.sub(r"\s*" + re.escape(SM_START) + ".*?" + re.escape(SM_END), "", s, flags=re.S)
    newest = entries[0]["date"] if entries else date.today().isoformat()
    urls = [("/log/", newest, "weekly", "0.8"), ("/log/archive/", newest, "weekly", "0.5"),
            ("/log/sources/", newest, "monthly", "0.4")]
    urls += [(entry_url(e), e["date"], "monthly", "0.7") for e in entries]
    block = "\n  " + SM_START + "".join(
        "\n  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>"
        % (SITE_URL, u, d, c, pr) for u, d, c, pr in urls) + "\n  " + SM_END
    s = s.replace("\n</urlset>", block + "\n</urlset>")
    p.write_text(s, encoding="utf-8")


def main():
    entries = load_entries()
    render_sitemap(entries)
    data = {k: read_json(DATA / (k + ".json")) for k in ("strip", "topology", "modelmix", "timeline", "modelmix_weeks")}
    render_index(entries, data)
    chrono = list(reversed(entries))
    for i, e in enumerate(chrono):
        render_entry(e, chrono[i - 1] if i else None, chrono[i + 1] if i + 1 < len(chrono) else None)
    render_archive(entries)
    render_sources(entries, data)
    render_feeds(entries)
    render_home_card(entries)
    changed = nav_everywhere()
    print("rendered %d entries; nav link added to %d existing pages" % (len(entries), len(changed)))
    for c in changed:
        print("  nav:", c)


if __name__ == "__main__":
    main()
