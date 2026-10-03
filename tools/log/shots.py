"""Serve the site over local http and capture full-page screenshots at 390 and 1440.

Never file://. Waits for fonts. Also prints per-page checks: horizontal overflow, min
rendered SVG text, tap targets under 44px, text rects outside the viewport.
Usage: python3 tools/log/shots.py OUTDIR [/path/ ...]
"""
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SITE  # noqa: E402

PW = os.environ.get("LOG_PW_PATH", str(Path.home() / ".cache/uv/archive-v0/7AwL17YS_5a4I37J/lib/python3.14/site-packages"))
sys.path.insert(0, PW)
from playwright.sync_api import sync_playwright  # noqa: E402

DEFAULT = ["/", "/log/", "/log/2026/09/cloud-migration/", "/log/2026/10/site-rebuild-fact-audit/", "/log/archive/",
           "/log/sources/"]
VPS = [(390, 844), (1440, 900)]
PROBE = """() => {
  const vw = innerWidth; let min = 1e9, minTxt = '', n = 0;
  for (const t of document.querySelectorAll('svg text')) {
    const r = t.getBoundingClientRect(); if (!r.width) continue;
    const m = t.ownerSVGElement && t.ownerSVGElement.getScreenCTM(); if (!m) continue;
    const px = parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b); n++;
    if (px < min) { min = px; minTxt = t.textContent.trim().slice(0, 30); }
  }
  const small = [];
  for (const a of document.querySelectorAll('main a, main button, header a, header button')) {
    const r = a.getBoundingClientRect(); if (!r.width || getComputedStyle(a).visibility === 'hidden') continue;
    if (a.closest('.sr-only') || a.closest('[hidden]')) continue;
    if (r.height < 44 && !a.closest('sup')) small.push((a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(r.height));
  }
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.sr-only') || el.children.length) continue;
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) out.push(el.tagName + ':' + (el.textContent || '').trim().slice(0, 20));
  }
  const clash = [], clip = [];
  for (const svg of document.querySelectorAll('main svg.dg, main .latest-fig svg')) {
    const sr = svg.getBoundingClientRect(); if (!sr.width) continue;
    const ts = [...svg.querySelectorAll('text')].map(t => [t, t.getBoundingClientRect()]).filter(x => x[1].width);
    for (const [t, r] of ts) {
      if (r.left < sr.left - 0.5 || r.right > sr.right + 0.5 || r.top < sr.top - 0.5 || r.bottom > sr.bottom + 0.5)
        clip.push(t.textContent.trim().slice(0, 24));
    }
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      const a = ts[i][1], b = ts[j][1];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1 && oy > 3) clash.push(ts[i][0].textContent.trim().slice(0, 16) + ' x ' + ts[j][0].textContent.trim().slice(0, 16));
    }
  }
  const h1 = document.querySelector('h1');
  return {h1px: h1 ? getComputedStyle(h1).fontSize : null, sw: document.documentElement.scrollWidth, vw, svgtext: n, min: n ? +min.toFixed(1) : null, minTxt,
          small: small.slice(0, 8), offscreen: out.slice(0, 8), clash: clash.slice(0, 8), clip: clip.slice(0, 8)};
}"""


def free_port():
    s = socket.socket()
    s.bind(("localhost", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def run(outdir, paths, theme=None):
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    port = free_port()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "localhost", "--directory", str(SITE)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    results = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
            for w, h in VPS:
                ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
                if theme:
                    ctx.add_init_script("try{localStorage.setItem('theme','%s')}catch(e){}" % theme)
                pg = ctx.new_page()
                for path in paths:
                    pg.goto("http://localhost:%d%s" % (port, path), wait_until="networkidle")
                    pg.evaluate("document.fonts.ready")
                    pg.wait_for_timeout(500)
                    r = pg.evaluate(PROBE)
                    name = (path.strip("/").replace("/", "_") or "home") + "_%d%s.png" % (w, "_" + theme if theme else "")
                    pg.screenshot(path=str(out / name), full_page=True)
                    r.update({"path": path, "w": w, "shot": name})
                    results.append(r)
                ctx.close()
            b.close()
    finally:
        srv.terminate()
    for r in results:
        bad = r["sw"] > r["vw"] or (r["min"] is not None and r["min"] < 13) or r["offscreen"] or r["clash"] or r["clip"]
        print("%s %4d %-42s h1=%s sw=%d svgtext=%d min=%s small=%s offscreen=%s clash=%s clip=%s" % (
            "FAIL" if bad else "ok  ", r["w"], r["path"], r["h1px"], r["sw"], r["svgtext"], r["min"], r["small"], r["offscreen"],
            r["clash"], r["clip"]))
    (out / "checks.json").write_text(json.dumps(results, indent=1))
    return results


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    theme = "dark" if "--dark" in sys.argv else None
    run(args[0], args[1:] or DEFAULT, theme)
