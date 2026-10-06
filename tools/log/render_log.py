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


def esc(s):
    return escape(str(s), quote=True)


# ------------------------------------------------------------------ shell

def shell():
    s = (SITE / "work/index.html").read_text(encoding="utf-8")
    b = s.index("<body>") + len("<body>")
    m = s.index('<main id="main">')
    f = s.index("</main>") + len("</main>")
    top = s[b:m]
    top = re.sub(r'\s*aria-current="page"', '', top)
    top = top.replace('<a href="/log/">Log</a>', '<a href="/log/" aria-current="page">Log</a>')
    return top, s[f:]


def og_image_for_path(path):
    p = path.strip("/")
    if p == "log":
        return "og-log.png"
    if p == "log/sources":
        return "og-log-sources.png"
    if p == "log/archive":
        return "og-log-archive.png"
    if "cloud-migration" in p:
        return "og-log-cloud-migration.png"
    if "site-rebuild-fact-audit" in p:
        return "og-log-site-rebuild-fact-audit.png"
    return "og-log.png"


def head(title, desc, path, ld, extra=""):
    url = SITE_URL + path
    og_img_name = og_image_for_path(path)
    img_url = SITE_URL + "/og/" + og_img_name
    img_alt = "%s, share card for krishnendu.me" % title
    is_art = path.count("/") > 3
    ogt = "article" if is_art else "website"
    
    art_meta = ""
    if is_art:
        art_meta = """  <meta property="article:published_time" content="%(pub)s">
  <meta property="article:author" content="%(person)s">
""" % {"pub": ld["@graph"][0].get("datePublished", ""), "person": PERSON}

    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%(t)s</title>
  <meta name="description" content="%(d)s">
  <link rel="canonical" href="%(u)s">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#F6F3EC" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#151514" media="(prefers-color-scheme: dark)">
  <link rel="alternate" type="application/rss+xml" title="Build log (RSS)" href="https://krishnendu.me/log/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Build log (JSON Feed)" href="https://krishnendu.me/log/feed.json">
  <link rel="preload" href="/fonts/Fraunces-Variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/SourceSans3-Variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <meta property="og:type" content="%(ogt)s">
  <meta property="og:site_name" content="Krishnendu Biswas">
  <meta property="og:locale" content="en_IN">
  <meta property="og:url" content="%(u)s">
  <meta property="og:title" content="%(t)s">
  <meta property="og:description" content="%(d)s">
  <meta property="og:image" content="%(img)s">
  <meta property="og:image:secure_url" content="%(img)s">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="%(img_alt)s">
%(art_meta)s  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="%(t)s">
  <meta name="twitter:description" content="%(d)s">
  <meta name="twitter:image" content="%(img)s">
  <meta name="twitter:image:alt" content="%(img_alt)s">
  <script type="application/ld+json">
%(ld)s
</script>
  <script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
</head>
<body>""" % {"t": esc(title), "d": esc(desc), "u": url, "ld": json.dumps(ld, indent=2, ensure_ascii=False),
             "ogt": ogt, "img": img_url, "img_alt": esc(img_alt), "art_meta": art_meta}


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
    for c in [c for c in strip["cells"] if c["key"] not in ESTATE_KEYS]:
        v = c["value"]
        shown = S.thousands(v) if isinstance(v, int) else str(v)
        cells.append('<div><dt class="mono">%s</dt><dd><span class="lab">%s</span><span class="unit">%s</span></dd></div>'
                     % (esc(shown), esc(c["label"]), esc(c["unit"])))
    gen = strip["generated"]
    when = human_date(gen) if gen != "not measured" else "not measured"
    return ('<section class="wrap strip-sec" aria-labelledby="h-week"><h2 id="h-week" class="strip-h">This week'
            '<span class="muted"> &middot; %s days to %s</span></h2><dl class="strip">%s</dl>'
            '<p class="small muted strip-note">Counts from the build board and model call logs. Institute work is excluded. '
            '<a href="/log/sources/#counting">How these are counted</a>. Profile, job and skill counts are on '
            '<a href="/work/platform/">the platform page</a>.</p></section>'
            % (strip["window_days"], esc(when), "".join(cells)))


def entry_rows(entries):
    out = []
    for e in entries:
        out.append('<li><div><h3><a href="%s">%s</a></h3><p>%s</p></div><span class="fact mono">%s</span></li>'
                   % (entry_url(e), esc(e["title"]), esc(first_sentence(e["what_changed"])), esc(human_date(e["date"]))))
    return '<ul class="rows" role="list">%s</ul>' % "".join(out)


ESTATE_KEYS = ("scheduled_jobs", "skills_unique")
IO_IN = "I dictate, check the text, then send it"
IO_OUT = "What needs me lands in Google Tasks"


def standing_figures(data):
    tp, tl, mm, hist = data["topology"], data["timeline"], data["modelmix"], data["modelmix_weeks"]
    out = []
    tp = dict(tp, input=IO_IN, output=IO_OUT)
    w, n = S.topology(tp, "lt")
    rows = [["Input (before the server)", IO_IN + ". Built-in voice plugins are skipped so I can read what got written."],
            [tp["router"], "Routes messages and hands work to profiles"]] + [
        [p, "Domain profile (the builder agent that does scoped, approved work)" if p == "workhorse" else "Domain profile"]
        for p in tp["profiles"]] + [["Output (after the server)", IO_OUT + ". Important items only."]]
    topo = figure("lt", w, n, "%s profiles, router included. Domain names only; one profile is shown as institute work, private."
                  % tp["count_including_router"], rows, ["Profile", "Role"], "topo-fig")
    w, n = S.timeline(tl, "ltl", tl["generated"], tl["days"])
    rows = [[human_date(d["date"]), d["title"], S.CAT_LABEL[d["category"]]] for d in tl["ledger"]]
    tlf = figure("ltl", w, n, "Public ledger milestones in the last %d days, %d dots. Undated or private milestones are not drawn."
                 % (tl["days"], tl["dots"]), rows, ["Date", "Milestone", "Category"], "tl-fig")
    out.append('<div class="pair">%s%s</div>' % (topo, tlf))
    w, n = S.model_bars(mm, "lm")
    rows = [[m["name"], S.thousands(m["calls"]), m["share_pct"] + "%"] for m in mm["models"]]
    out.append(figure("lm", w, n, "Model calls in the %s-day window, by model, %s calls in total. Bars start at zero. Names are as logged, including fallback models. "
                      "Raw model ids are on the sources page."
                      % (mm["window_days"], S.thousands(mm["total_calls"])), rows, ["Model", "Calls", "Share"]))
    w, n = S.model_trend(hist, "lmt")
    rows = [[human_date(wk["end"]), ", ".join("%s %s" % (k, S.thousands(v)) for k, v in sorted(wk["calls_by_name"].items(), key=lambda kv: -kv[1]))]
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
    main = ('<nav class="breadcrumb wrap" aria-label="Breadcrumbs"><ol><li><a href="/">Home</a></li><li aria-current="page">Build log</li></ol></nav>'
            '<div class="wrap page-head log-head"><h1>Build log</h1>'
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
    main = ('<nav class="breadcrumb wrap" aria-label="Breadcrumbs"><ol><li><a href="/">Home</a></li><li><a href="/log/">Build log</a></li><li aria-current="page">%s</li></ol></nav>'
            '<article class="wrap entry-page">'
            '<header class="page-head"><h1>%s</h1><p class="meta"><time datetime="%s">%s</time> &middot; %s &middot; %s</p></header>'
            '%s%s</article>' % (esc(e["title"]), esc(e["title"]), e["date"], esc(human_date(e["date"])), STATUS[e["status"]],
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
    main = ('<nav class="breadcrumb wrap" aria-label="Breadcrumbs"><ol><li><a href="/">Home</a></li><li><a href="/log/">Build log</a></li><li aria-current="page">Archive</li></ol></nav>'
            '<div class="wrap"><div class="page-head"><h1>All entries</h1>'
            '<p class="deck">Every build log entry, newest first, grouped by month.</p></div>%s</div>' % "".join(parts))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": SITE_URL + "/log/archive/#webpage", "url": SITE_URL + "/log/archive/",
         "name": "All entries | Build log", "author": {"@id": PERSON}, "isPartOf": {"@id": SITE_URL + "/log/#blog"},
         "mainEntityOfPage": SITE_URL + "/log/archive/", "datePublished": "2026-10-06T00:00:00+05:30",
         "dateModified": "2026-10-06T00:00:00+05:30", "image": SITE_URL + "/og/og-log-archive.png", "inLanguage": "en",
         "breadcrumb": crumbs([("Home", "/"), ("Build log", "/log/"), ("All entries", "/log/archive/")])}]}
    page("/log/archive/", "All entries | Build log", "Every build log entry, newest first, grouped by month.", ld, main)


def nbsp_last(text):
    if not text:
        return text
    parts = text.rsplit(" ", 1)
    return "&nbsp;".join(parts) if len(parts) == 2 else text


def render_sources(entries, data):
    tags = {}
    for e in entries:
        for s in e["sources"]:
            tags.setdefault(s["tag"], (s["label"], []))[1].append(e)
    rows = "".join('<li id="%s" data-src="%s">%s. Cited in: %s</li>' % (
        anchor(t), esc(t), nbsp_last(esc(lab)), ", ".join('<a href="%s">%s</a>' % (entry_url(e), nbsp_last(esc(e["title"]))) for e in es))
        for t, (lab, es) in sorted(tags.items()))
    cells = "".join("<li><strong>%s</strong>: %s.</li>" % (esc(c["label"]), nbsp_last(esc(c["unit"]))) for c in data["strip"]["cells"])
    names = "".join("<li>%s is logged as <span class=\"mono\">%s</span>.</li>" % (esc(m["name"]), esc(m["id"]))
                    for m in data["modelmix"]["models"] if m["name"] != m["id"])
    main = ('<nav class="breadcrumb wrap" aria-label="Breadcrumbs"><ol><li><a href="/">Home</a></li><li><a href="/log/">Build log</a></li><li aria-current="page">How I source these numbers</li></ol></nav>'
            '<div class="wrap"><div class="page-head"><h1>How I source these numbers</h1>'
            '<p class="deck">Every number in an entry carries a tag that points to where it came from.</p></div>'
            '<h2 id="tags">Tag formats</h2><ul class="src-list">'
            '<li><span class="mono">G:</span> a milestone in my append-only ledger. Each milestone gets an ID when it happens, and the ID never&nbsp;changes.</li>'
            '<li><span class="mono">K:</span> a task card on the build board, where agents pick up work and I approve or return&nbsp;it.</li>'
            '<li><span class="mono">T:</span> one day of model call logs, counted per&nbsp;model.</li>'
            '<li><span class="mono">D:</span> one daily progress report. Used as a drafting hint, never&nbsp;quoted.</li></ul>'
            '<h2 id="counting">How the weekly figures are counted</h2><ul class="src-list">%s</ul>'
            '<p>A cell that has no source for the week shows &ldquo;not measured&rdquo; instead of zero. Institute work runs in a separate, private profile and is left out of every count.</p>'
            '<h2 id="models">Model names</h2><p>Charts use the model name. The id is what the call log records.</p><ul class="src-list">%s</ul>'
            '<h2 id="privacy">What never appears here</h2><p>Client names, institute work, money amounts, channel names, server addresses, ports and file paths. '
            'A script checks every page for these before I see the draft, and I check the rest by&nbsp;hand.</p>'
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
        img_name = og_image_for_path(entry_url(e))
        img_path = SITE / "og" / img_name
        img_len = str(img_path.stat().st_size) if img_path.exists() else "25000"
        img_url = SITE_URL + "/og/" + img_name
        
        items.append(f"""    <item>
      <title>{esc(e["title"])}</title>
      <link>{u}</link>
      <guid isPermaLink="true">{u}</guid>
      <pubDate>{rfc822(e["date"])}</pubDate>
      <description>{esc(plain(e["what_changed"]))}</description>
      <enclosure url="{img_url}" length="{img_len}" type="image/png" />
      <content:encoded><![CDATA[{entry_html_for_feed(e)}]]></content:encoded>
    </item>""")
        
    last = rfc822(entries[0]["date"]) if entries else rfc822(date.today().isoformat())
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Build log | Krishnendu Biswas</title>
    <link>{SITE_URL}/log/</link>
    <atom:link href="{SITE_URL}/log/feed.xml" rel="self" type="application/rss+xml"/>
    <description>What I build and run with agents, reviewed before publishing.</description>
    <language>en</language>
    <lastBuildDate>{last}</lastBuildDate>
{"".join(items)}
  </channel>
</rss>
"""
    (LOG / "feed.xml").write_text(rss, encoding="utf-8")
    
    jf_items = []
    for e in entries:
        img_name = og_image_for_path(entry_url(e))
        img_url = SITE_URL + "/og/" + img_name
        jf_items.append({
            "id": SITE_URL + entry_url(e),
            "url": SITE_URL + entry_url(e),
            "title": e["title"],
            "summary": plain(e["what_changed"]),
            "image": img_url,
            "content_html": entry_html_for_feed(e),
            "date_published": iso_dt(e["date"]),
            "tags": [e["category"], e["status"]]
        })
        
    jf = {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "Build log | Krishnendu Biswas",
        "home_page_url": SITE_URL + "/log/",
        "feed_url": SITE_URL + "/log/feed.json",
        "description": "What I build and run with agents, reviewed before publishing.",
        "language": "en",
        "authors": [{"name": "Krishnendu Biswas", "url": SITE_URL + "/"}],
        "items": jf_items
    }
    (LOG / "feed.json").write_text(json.dumps(jf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


HOME_START, HOME_END = "<!-- build-log:start -->", "<!-- build-log:end -->"


def render_home_card(entries):
    p = SITE / "index.html"
    s = p.read_text(encoding="utf-8")
    s = re.sub(re.escape(HOME_START) + ".*?" + re.escape(HOME_END), "", s, flags=re.S)
    if entries:
        e = entries[0]
        card = ('%s<section class="wrap log-line" id="build-log" aria-labelledby="h-latest">'
                '<h2 id="h-latest" class="sr-only">Latest from the build log</h2>'
                '<p><span class="muted">Build log, <time datetime="%s">%s</time>:</span> '
                '<a href="%s">%s</a> <a class="log-all" href="/log/">All entries <svg class="icon" aria-hidden="true"><use href="#i-arr"/></svg></a></p>'
                '</section>%s'
                % (HOME_START, e["date"], esc(human_date(e["date"])), entry_url(e), esc(e["title"]), HOME_END))
        if 'id="leadership"' in s:
            i = s.index('id="leadership"')
            i = s.index("</section>", i) + len("</section>")
            s = s[:i] + "\n  " + card + s[i:]
        elif 'id="agent-systems"' in s:
            i = s.index('id="agent-systems"')
            i = s.index("</section>", i) + len("</section>")
            s = s[:i] + "\n  " + card + s[i:]
    p.write_text(s, encoding="utf-8")


def main():
    entries = load_entries()
    data = {k: read_json(DATA / (k + ".json")) for k in ("strip", "topology", "modelmix", "timeline", "modelmix_weeks")}
    render_index(entries, data)
    chrono = list(reversed(entries))
    for i, e in enumerate(chrono):
        render_entry(e, chrono[i - 1] if i else None, chrono[i + 1] if i + 1 < len(chrono) else None)
    render_archive(entries)
    render_sources(entries, data)
    render_feeds(entries)
    render_home_card(entries)
    print("Rendered build log pages, feeds, and entries successfully.")


if __name__ == "__main__":
    main()
