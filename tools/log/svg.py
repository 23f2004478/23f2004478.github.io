"""Deterministic SVG templates for the build log. Same JSON in, same bytes out.

Every template returns (wide_svg, narrow_svg). Font floors: wide 15 to 16 (shown >= 592px
container or capped so scale >= 0.87), narrow 14 (shown at >= 328px for a 340 viewBox).
Colours come from the site's diagram classes (k-a, k-b, k-n, k-p, t-a, t-s, edge, rule).
"""
from datetime import date, timedelta
from html import escape

CHAR = 0.53  # average Source Sans 3 advance per em, used only for wrapping


def esc(s):
    return escape(str(s), quote=True)


def wrap(text, max_px, fs):
    per = max(4, int(max_px / (fs * CHAR)))
    out, cur = [], ""
    for w in str(text).split():
        if cur and len(cur) + 1 + len(w) > per:
            out.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        out.append(cur)
    return out


def head(cls, vb_w, vb_h, uid, title, desc):
    return ('<svg class="dg %s" viewBox="0 0 %d %d" role="img" aria-labelledby="%s-t %s-d" '
            'xmlns="http://www.w3.org/2000/svg"><title id="%s-t">%s</title><desc id="%s-d">%s</desc>'
            % (cls, vb_w, vb_h, uid, uid, uid, esc(title), uid, esc(desc)))


def marker(uid):
    return ('<defs><marker id="%s-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
            'orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>' % uid)


def t(x, y, s, fs, cls="", anchor=None, weight=None):
    a = ' text-anchor="%s"' % anchor if anchor else ""
    w = ' font-weight="%s"' % weight if weight else ""
    c = ' class="%s"' % cls if cls else ""
    return '<text%s x="%s" y="%s" font-size="%s"%s%s>%s</text>' % (c, _n(x), _n(y), fs, a, w, esc(s))


def _hd(iso):
    """'2026-09-11' -> '11 Sep 2026' (site-wide visible date format)."""
    y, m, d = iso[:10].split("-")
    return "%d %s %s" % (int(d), "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()[int(m) - 1], y)


def _n(v):
    v = round(v, 1)
    return str(int(v)) if v == int(v) else str(v)


def thousands(n):
    return format(n, ",")


# ---------------------------------------------------------------- entry templates

def before_after(d, uid):
    return _ba_wide(d, uid + "w"), _ba_narrow(d, uid + "n", 340, 14)


def before_after_thumb(d, uid):
    return _ba_narrow(d, uid, 240, 14, compact=True)


def _ba_box(x, y, w, title, items, fs, accent, pad=14):
    lines = wrap(title, w - 2 * pad, fs + 1)
    th = 12 + len(lines) * (fs + 6) + 6
    ih = fs + 14
    h = th + len(items) * ih + 8
    o = ['<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % ("k-a" if accent else "k-b", _n(x), _n(y), _n(w), _n(h))]
    yy = y + 10 + fs + 2
    for ln in lines:
        o.append(t(x + pad, yy, ln, fs + 1, "t-a" if accent else "", weight="600"))
        yy += fs + 6
    yy = y + th
    for it in items:
        o.append('<line class="%s" x1="%s" y1="%s" x2="%s" y2="%s"/>' % ("rule-a" if accent else "rule", _n(x + pad), _n(yy), _n(x + w - pad), _n(yy)))
        o.append(t(x + pad, yy + fs + 4, it, fs, "t-a" if accent else "t-s"))
        yy += ih
    return o, h


def _ba_wide(d, uid):
    W, fs, bw = 680, 16, 250
    left, lh = _ba_box(1, 1, bw, d["before_title"], d["before_items"], fs, False)
    right, rh = _ba_box(W - bw - 1, 1, bw, d["after_title"], d["after_items"], fs, True)
    H = max(lh, rh) + 2
    cy = 1 + H / 2
    ax1, ax2 = bw + 14, W - bw - 14
    lab = wrap(d["arrow"], ax2 - ax1 - 8, 15)
    o = [head("wide", W, H, uid, d["title"], d["desc"]), marker(uid)]
    o += left + right
    o.append('<path class="edge" d="M%s %sH%s" marker-end="url(#%s-ah)"/>' % (_n(ax1), _n(cy), _n(ax2), uid))
    for i, ln in enumerate(lab):
        o.append(t((ax1 + ax2) / 2, cy - 12 - (len(lab) - 1 - i) * 20, ln, 15, anchor="middle"))
    o.append("</svg>")
    return "".join(o)


def _ba_narrow(d, uid, W, fs, compact=False):
    bw = W - 2
    items_b = d["before_items"] if not compact else d["before_items"][:2]
    items_a = d["after_items"] if not compact else d["after_items"][:2]
    top, th = _ba_box(1, 1, bw, d["before_title"], items_b, fs, False, pad=12)
    gap = 56
    y2 = 1 + th + gap
    bot, bh = _ba_box(1, y2, bw, d["after_title"], items_a, fs, True, pad=12)
    H = y2 + bh + 2
    ax = 28
    o = [head("narrow" if not compact else "thumb", W, H, uid, d["title"], d["desc"]), marker(uid)]
    o += top + bot
    o.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (ax, _n(1 + th + 6), _n(y2 - 6), uid))
    o.append(t(ax + 14, 1 + th + gap / 2 + fs / 2 - 1, d["arrow"], fs))
    o.append("</svg>")
    return "".join(o)


def pipeline(d, uid):
    return _pl_wide(d, uid + "w"), _pl_narrow(d, uid + "n", 340, 14)


def pipeline_thumb(d, uid):
    return _pl_narrow(d, uid, 240, 14, compact=True)


def _pl_wide(d, uid):
    W, fs, gap = 680, 16, 22
    n = len(d["steps"])
    bw = (W - 2 - gap * (n - 1)) / n
    bh = 64
    y0 = 1
    o: list = ["", marker(uid)]
    xs = []
    for i, s in enumerate(d["steps"]):
        x = 1 + i * (bw + gap)
        xs.append(x)
        acc = i == d.get("accent_step")
        o.append('<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % ("k-a" if acc else "k-b", _n(x), y0, _n(bw), bh))
        lines = wrap(s, bw - 16, fs)
        base = y0 + bh / 2 - (len(lines) - 1) * 10 + 5
        for j, ln in enumerate(lines):
            o.append(t(x + bw / 2, base + j * 20, ln, fs, "t-a" if acc else "", anchor="middle", weight="600"))
        if i:
            o.append('<path class="edge" d="M%s %sH%s" marker-end="url(#%s-ah)"/>' % (_n(x - gap + 2), _n(y0 + bh / 2), _n(x - 3), uid))
    f, to = d["loop_from"], d["loop_to"]
    fx, tx = xs[f] + bw / 2, xs[to] + bw / 2
    ly = y0 + bh + 34
    o.append('<path class="edge" d="M%s %sV%sH%sV%s" marker-end="url(#%s-ah)"/>' % (_n(fx), y0 + bh, _n(ly), _n(tx), _n(y0 + bh + 4), uid))
    o.append(t((fx + tx) / 2, ly + 24, d["loop_label"], 15, anchor="middle"))
    H = int(ly + 34)
    o[0] = head("wide", W, H, uid, d["title"], d["desc"])
    o.append("</svg>")
    return "".join(o)


def _pl_narrow(d, uid, W, fs, compact=False):
    n = len(d["steps"])
    bw = 170 if not compact else 132
    bh = 40 if not compact else 34
    gap = 22 if not compact else 16
    o: list = ["", marker(uid)]
    ys = []
    for i, s in enumerate(d["steps"]):
        y = 1 + i * (bh + gap)
        ys.append(y)
        acc = i == d.get("accent_step")
        o.append('<rect class="%s" x="1" y="%s" width="%s" height="%s" rx="3"/>' % ("k-a" if acc else "k-b", _n(y), bw, bh))
        o.append(t(14, y + bh / 2 + fs / 2 - 1, s, fs, "t-a" if acc else "", weight="600"))
        if i:
            o.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (40, _n(y - gap + 2), _n(y - 3), uid))
    f, to = d["loop_from"], d["loop_to"]
    lx = bw + 22
    fy, ty = ys[f] + bh / 2, ys[to] + bh / 2
    o.append('<path class="edge" d="M%s %sH%sV%sH%s" marker-end="url(#%s-ah)"/>' % (bw + 1, _n(fy), lx, _n(ty), bw + 4, uid))
    lab = wrap(d["loop_label"], W - lx - 12, fs)
    lh = fs + 7
    my = (fy + ty) / 2 - (len(lab) - 1) * lh / 2 + fs / 2 - 2
    for j, ln in enumerate(lab):
        o.append(t(lx + 8, my + j * lh, ln, fs))
    H = int(ys[-1] + bh + 2)
    o[0] = head("narrow" if not compact else "thumb", W, H, uid, d["title"], d["desc"])
    o.append("</svg>")
    return "".join(o)


TEMPLATES = {"before_after": (before_after, before_after_thumb), "pipeline": (pipeline, pipeline_thumb)}


# ---------------------------------------------------------------- standing visuals

def topology(tp, uid):
    return _topo(tp, uid + "w", 520, 3, 15), _topo(tp, uid + "n", 340, 2, 14)


def _topo(tp, uid, W, cols, fs):
    profiles = [p for p in tp["profiles"] if p != "institute work, private"]
    private = [p for p in tp["profiles"] if p == "institute work, private"]
    pad, gap, ch = 14, 8, 34
    inner_x, inner_w = 1 + pad, W - 2 - 2 * pad
    o: list = ["", marker(uid)]
    y = 1 + 12 + fs
    title_y = y
    y += 14
    bh = 38
    o.append('<rect class="k-b" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % (inner_x, y, inner_w, bh))
    o.append(t(W / 2, y + bh / 2 + fs / 2 - 1, "Messaging gateway", fs, anchor="middle"))
    y += bh
    o.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (_n(W / 2), y, y + 22, uid))
    y += 24
    o.append('<rect class="k-a" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % (inner_x, y, inner_w, bh))
    o.append(t(W / 2, y + bh / 2 + fs / 2 - 1, "Router profile (default)", fs, "t-a", anchor="middle", weight="600"))
    y += bh
    bus_y = y + 16
    o.append('<path class="edge" d="M%s %sV%s"/>' % (_n(W / 2), y, bus_y))
    cw = (inner_w - gap * (cols - 1)) / cols
    cells = []
    for i, p in enumerate(profiles):
        r, c = divmod(i, cols)
        cells.append((p, r, c, 1))
    last_r, last_c = divmod(len(profiles), cols)
    if private:
        span = cols - last_c if last_c else cols
        row = last_r
        cells.append((private[0], row, last_c, span))
    rows = max(r for _, r, _, _ in cells) + 1
    gy = bus_y + 14
    o.append('<line class="edge" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (_n(inner_x + cw / 2), bus_y, _n(inner_x + inner_w - cw / 2), bus_y))
    for c in range(cols):
        cx = inner_x + c * (cw + gap) + cw / 2
        o.append('<path class="edge" d="M%s %sV%s"/>' % (_n(cx), bus_y, gy))
    for p, r, c, span in cells:
        x = inner_x + c * (cw + gap)
        w = cw * span + gap * (span - 1)
        yy = gy + r * (ch + gap)
        priv = p == "institute work, private"
        o.append('<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % ("k-p" if priv else "k-n", _n(x), _n(yy), _n(w), ch))
        o.append(t(x + 10, yy + ch / 2 + fs / 2 - 1, p, fs, "t-s" if priv else ""))
    y = gy + rows * (ch + gap) - gap + 18
    o.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (_n(W / 2), _n(y - 18), _n(y + 4), uid))
    y += 6
    o.append('<rect class="k-b" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % (inner_x, _n(y), inner_w, bh))
    o.append(t(W / 2, y + bh / 2 + fs / 2 - 1, "Model gateway (9Router)", fs, anchor="middle"))
    y += bh + pad
    H = int(y + 1)
    o.insert(2, '<rect class="k-d" x="1" y="1" width="%s" height="%s" rx="4"/>' % (W - 2, H - 2))
    o.insert(3, t(inner_x, title_y, "Cloud server, Ubuntu", fs, weight="600"))
    n = tp["count_including_router"]
    # input and output ends (owner, 2026-10-05): dictated text in above the server, Google Tasks out below it
    io_in, io_out = tp.get("input"), tp.get("output")
    top = 0
    pre, post = [], []
    if io_in:
        pre.append('<rect class="k-n" x="%s" y="1" width="%s" height="%s" rx="3"/>' % (inner_x, inner_w, bh))
        pre.append(t(W / 2, 1 + bh / 2 + fs / 2 - 1, io_in, fs, anchor="middle", weight="600"))
        pre.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (_n(W / 2), 1 + bh, 1 + bh + 20, uid))
        top = 1 + bh + 22
    if io_out:
        y0 = top + H
        post.append('<path class="edge" d="M%s %sV%s" marker-end="url(#%s-ah)"/>' % (_n(W / 2), y0, y0 + 20, uid))
        post.append('<rect class="k-n" x="%s" y="%s" width="%s" height="%s" rx="3"/>' % (inner_x, y0 + 22, inner_w, bh))
        post.append(t(W / 2, y0 + 22 + bh / 2 + fs / 2 - 1, io_out, fs, anchor="middle", weight="600"))
    total = top + H + ((22 + bh + 1) if io_out else 0)
    desc = ("Inside one cloud server: a messaging gateway feeds the router profile, which hands work to %d domain "
            "profiles: %s. One profile is shown only as institute work, private. Model calls from every profile "
            "go through the model gateway. %s profiles in total, router included." % (len(tp["profiles"]), ", ".join(profiles), n))
    if io_in:
        desc = "Above the server: %s. " % io_in + desc
    if io_out:
        desc += " Below the server: %s." % io_out
    o[0] = head("wide topo-w" if cols > 2 else "narrow topo-n", W, total, uid, "Agent estate: %s profiles, router included" % n, desc)
    body = "".join(o[2:])
    o = [o[0], o[1]] + pre + (['<g transform="translate(0 %s)">' % top, body, "</g>"] if top else [body]) + post
    o.append("</svg>")
    return "".join(o)


CAT_CLASS = {"infra": "c-infra", "capability": "c-cap", "site": "c-site", "process": "c-proc"}
CAT_LABEL = {"infra": "Infrastructure", "capability": "Capability", "site": "Site", "process": "Process"}


def timeline(tl, uid, end_iso, days=90):
    return _tl(tl, uid + "w", 520, 15, end_iso, days), _tl(tl, uid + "n", 340, 14, end_iso, days)


def _tl(tl, uid, W, fs, end_iso, days):
    end = date.fromisoformat(end_iso[:10])
    start = end - timedelta(days=days - 1)
    x0, x1 = 12, W - 12
    def X(dt):
        return x0 + (dt - start).days * (x1 - x0) / (days - 1)
    o: list = [""]
    # legend
    lx, ly = 1, fs + 2
    cats = ["infra", "capability", "site", "process"]
    for c in cats:
        lab = CAT_LABEL[c]
        wpx = len(lab) * fs * CHAR + 26
        if lx + wpx > W:
            lx, ly = 1, ly + fs + 10
        o.append('<circle class="%s" cx="%s" cy="%s" r="5"/>' % (CAT_CLASS[c], _n(lx + 6), _n(ly - fs / 2 + 2)))
        o.append(t(lx + 16, ly, lab, fs))
        lx += wpx + 6
    r = 5
    placed = []
    dots = []
    for dt in tl["ledger"]:
        dd = date.fromisoformat(dt["date"])
        if dd < start or dd > end:
            continue
        x = X(dd)
        lvl = 0
        while any(abs(px - x) < 2 * r + 2 and pl == lvl for px, pl in placed):
            lvl += 1
        placed.append((x, lvl))
        dots.append((x, lvl, dt))
    maxl = max([l for _, l, _ in dots] or [0])
    axis_y = ly + 20 + (maxl + 1) * (2 * r + 3) + 6
    for x, lvl, dt in dots:
        cy = axis_y - 8 - lvl * (2 * r + 3)
        o.append('<circle class="%s" cx="%s" cy="%s" r="%s"><title>%s, %s</title></circle>' % (CAT_CLASS[dt["category"]], _n(x), _n(cy), r, esc(_hd(dt["date"])), esc(dt["title"])))
    o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (x0, _n(axis_y), x1, _n(axis_y)))
    # month ticks on the 1st of each month inside the window
    m = date(start.year, start.month, 1)
    ticks = []
    while m <= end:
        if m >= start:
            ticks.append(m)
        m = date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    from common import MONTHS
    for tk in ticks:
        x = X(tk)
        o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (_n(x), _n(axis_y), _n(x), _n(axis_y + 6)))
        anchor = "end" if x > W - 30 else "middle"
        o.append(t(x, axis_y + 8 + fs, "1 %s" % MONTHS[tk.month - 1], fs, "t-s", anchor=anchor))
    H = int(axis_y + 14 + fs)
    desc = "Dot timeline of public ledger milestones from %s to %s, coloured by category. %d dated milestones shown." % (
        _hd(start.isoformat()), _hd(end.isoformat()), len(dots))
    o[0] = head("wide" if W > 400 else "narrow", W, H, uid, "Public milestones, last %d days" % days, desc)
    o.append("</svg>")
    return "".join(o)


def model_bars(mm, uid):
    return _mb_wide(mm, uid + "w"), _mb_narrow(mm, uid + "n")


def _share(m):
    return m["share_pct"] + "%"


def _mb_wide(mm, uid):
    W, fs, lw, vw = 680, 16, 200, 140
    models = mm["models"]
    top = mm["axis_ticks"][-1]
    bx0, bx1 = lw, W - vw
    rh = 32
    y0 = 6
    o: list = [""]
    for i, m in enumerate(models):
        y = y0 + i * rh
        w = (bx1 - bx0) * m["calls"] / top
        o.append(t(lw - 10, y + rh / 2 + fs / 2 - 2, m["name"], fs, anchor="end"))
        o.append('<rect class="%s" x="%s" y="%s" width="%s" height="%s"/>' % ("bar-a" if i == 0 else "bar-n", bx0, _n(y + 4), _n(max(w, 1.5)), rh - 8))
        lab = "%s (%s)" % (thousands(m["calls"]), _share(m))
        need = len(lab) * fs * 0.62 + 16
        if bx0 + w + need > W:
            # long bar: value sits inside the bar end, on-bar ink
            o.append(t(bx0 + w - 8, y + rh / 2 + fs / 2 - 2, lab, fs, "mono-n " + ("t-a" if i == 0 else "t-on-n"), anchor="end"))
        else:
            o.append(t(bx0 + max(w, 1.5) + 8, y + rh / 2 + fs / 2 - 2, lab, fs, "mono-n"))
    ay = y0 + len(models) * rh + 4
    o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (bx0, _n(ay), bx1, _n(ay)))
    for tk in mm["axis_ticks"]:
        x = bx0 + (bx1 - bx0) * tk / top
        o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (_n(x), _n(ay), _n(x), _n(ay + 6)))
        o.append(t(x, ay + 8 + fs, thousands(tk), fs - 1, "t-s", anchor="middle"))
    o.append(t(bx0 + (bx1 - bx0) / 2, ay + 2 * fs + 16, "Model calls in the window (count)", fs - 1, "t-s", anchor="middle"))
    H = int(ay + 2 * fs + 24)
    o[0] = head("wide chart", W, H, uid, _mb_title(mm), _mb_desc(mm))
    o.append("</svg>")
    return "".join(o)


def _mb_narrow(mm, uid):
    W, fs = 340, 14
    models = mm["models"]
    top = mm["axis_ticks"][-1]
    bx0, bx1 = 1, W - 2
    y = 2
    o: list = [""]
    for i, m in enumerate(models):
        o.append(t(1, y + fs, m["name"], fs))
        o.append(t(W - 2, y + fs, "%s (%s)" % (thousands(m["calls"]), _share(m)), fs, "mono-n", anchor="end"))
        w = (bx1 - bx0) * m["calls"] / top
        o.append('<rect class="%s" x="%s" y="%s" width="%s" height="12"/>' % ("bar-a" if i == 0 else "bar-n", bx0, _n(y + fs + 6), _n(max(w, 1.5))))
        y += fs + 6 + 12 + 12
    o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (bx0, _n(y), bx1, _n(y)))
    for tk in mm["axis_ticks"]:
        x = bx0 + (bx1 - bx0) * tk / top
        anchor = "start" if tk == 0 else ("end" if tk == top else "middle")
        o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (_n(x), _n(y), _n(x), _n(y + 6)))
        o.append(t(x, y + 8 + fs, thousands(tk), fs, "t-s", anchor=anchor))
    o.append(t(bx0 + (bx1 - bx0) / 2, y + 2 * fs + 16, "Model calls in the window (count)", fs, "t-s", anchor="middle"))
    H = int(y + 2 * fs + 24)
    o[0] = head("narrow chart", W, H, uid, _mb_title(mm), _mb_desc(mm))
    o.append("</svg>")
    return "".join(o)


def _mb_title(mm):
    return "Model calls by model, last %s days" % mm["window_days"]


def _mb_desc(mm):
    parts = ["%s: %s calls (%s)" % (m["name"], thousands(m["calls"]), _share(m)) for m in mm["models"]]
    return "Horizontal bar chart, zero-based. " + "; ".join(parts) + ". Total %s calls." % thousands(mm["total_calls"])


def model_trend(hist, uid):
    return _mt(hist, uid + "w", 680, 16, 8), _mt(hist, uid + "n", 340, 14, 4)


def _mt(hist, uid, W, fs, nweeks):
    weeks = [w["end"] for w in hist["weeks"]][-nweeks:]
    data = {w["end"]: w["calls_by_name"] for w in hist["weeks"]}
    names = hist["names"]
    top = max([v for w in hist["weeks"] for v in w["calls_by_name"].values()] or [1])
    narrow = W < 400
    lw = 0  # model name sits on its own line above each row, so columns get the full width
    cw = (W - lw - 2) / len(weeks)
    o: list = [""]
    from common import MONTHS
    y = 2
    ch = 30
    for nm in names:
        o.append(t(1, y + fs + 2, nm, fs, weight="600"))
        y += fs + 8
        for i, we in enumerate(weeks):
            x = lw + i * cw + 3
            v = data.get(we, {}).get(nm) if we in data else None
            o.append('<line class="axis" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (_n(x), _n(y + ch), _n(x + cw - 6), _n(y + ch)))
            if we not in data:
                continue
            v = v or 0
            h = (ch - 4) * v / top
            if v:
                o.append('<rect class="bar-n" x="%s" y="%s" width="%s" height="%s"/>' % (_n(x), _n(y + ch - max(h, 1.5)), _n(min(14, cw - 8)), _n(max(h, 1.5))))
            o.append(t(x + min(14, cw - 8) + 4, y + ch - 3, thousands(v), fs - (0 if narrow else 1), "mono-n"))
        y += ch + 8
    # Date label sits directly under its own column, right below that column's last bar,
    # not in a shared header far from the bars (ambiguous once several model rows stack up).
    dy = y + fs
    for i, we in enumerate(weeks):
        dd = date.fromisoformat(we)
        o.append(t(lw + i * cw + cw / 2, dy, "%d %s" % (dd.day, MONTHS[dd.month - 1]), fs - (0 if narrow else 1), "t-s", anchor="middle"))
    y = dy + 6
    o.append(t(lw + (len(weeks) * cw) / 2, y + fs + 6, "Model calls per week (count)", fs - (0 if narrow else 1), "t-s", anchor="middle"))
    unmeasured = [w for w in weeks if w not in data]
    H = int(y + 2 * fs + 14)
    desc = ("Small multiples: one row per model, one column per week ending on the date shown below its own column, bar "
            "height on a shared zero-based scale. %d of %d weeks shown have no measurement and are left empty." % (len(unmeasured), len(weeks)))
    o[0] = head(("narrow" if narrow else "wide") + " chart", W, H, uid, "Model calls per week, %d weeks" % len(weeks), desc)
    o.append("</svg>")
    return "".join(o)
