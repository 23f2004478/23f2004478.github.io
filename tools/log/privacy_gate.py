"""Step 5: privacy gate for build log pages, feeds and data. All checks must pass.

Checks
  1 deny list (LOG_DENY_LIST, outside the repo; hits reported by line number, never by term)
  2 regex: filesystem paths, IPv4/IPv6, email, ports, keys and bearer tokens,
    Discord/Telegram IDs and bot tokens, currency with digits
  3 word budgets per field and total (entries)
  4 every number in copy matches an allowed token (entry facts, data JSON, dates, source tags)
  5 banned phrases
  6 U+2013 / U+2014

Usage
  python3 tools/log/privacy_gate.py            scan /log/ pages, feeds, data, home card
  python3 tools/log/privacy_gate.py --fixture  run the 20 planted leaks + 0 false positives test
Exit 0 = pass.
"""
import argparse
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import miniyaml  # noqa: E402
from common import DATA, LOG, SITE, TOOLS, env_path, load_entries, words  # noqa: E402

ALLOW = miniyaml.load(TOOLS / "publish_allowlist.yaml")
PUBLIC_EMAILS = {"krishnendu.biswasi22@iimranchi.ac.in"}

RX = [
    ("path", re.compile(r"(?<![\w.])(?:~/|/(?:home|opt|etc|var|usr|srv|root|tmp|mnt|proc|sys)/)[^\s<>\"']*")),
    ("path", re.compile(r"\b[A-Za-z]:\\[^\s<>\"']+")),
    ("path", re.compile(r"(?<![\w/])\.(?:hermes|ssh|config|env)\b/?")),
    ("ipv4", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("ipv6", re.compile(r"\b(?:[0-9a-fA-F]{1,4}:){3,7}[0-9a-fA-F]{1,4}\b|\b[0-9a-fA-F]{1,4}::[0-9a-fA-F:]*\b")),
    ("email", re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")),
    ("port", re.compile(r"(?:\blocalhost|\b\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-fA-F:]+\]|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+):\d{2,5}\b", re.I)),
    ("port", re.compile(r"\bport\s+\d{2,5}\b", re.I)),
    ("secret", re.compile(r"\bBearer\s+[A-Za-z0-9._\-]{8,}", re.I)),
    ("secret", re.compile(r"\b(?:sk|pk|rk)-[A-Za-z0-9_\-]{12,}")),
    ("secret", re.compile(r"\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{10,}")),
    ("secret", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("secret", re.compile(r"\bxox[abpr]-[A-Za-z0-9\-]{10,}")),
    ("secret", re.compile(r"\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S{6,}", re.I)),
    ("tg_token", re.compile(r"\b\d{8,10}:[A-Za-z0-9_\-]{30,}\b")),
    ("snowflake", re.compile(r"(?<![\d.])\d{15,20}(?![\d.])")),
    ("currency", re.compile(r"[\u20b9$\u20ac\u00a3\u00a5]\s?\d")),
    ("currency", re.compile(r"\b(?:INR|USD|EUR|GBP|Rs\.?)\s?\d", re.I)),
    ("currency", re.compile(r"\d[\d,.]*\s?(?:INR|USD|EUR|rupees?|dollars?|lakhs?|crores?)\b", re.I)),
]
DASHES = re.compile("[\u2013\u2014]")
URL = re.compile(r"https?://[^\s\"'<>]+")
# ISO date, optionally with the fixed release time and IST offset; the date must be a sourced date
ISO = re.compile(r"\b(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:\d{2})?)?\b")
# RFC 822 clock and zone in RSS dates (fixed 20:00 +0530 release time, not a claim)
RFC_TIME = re.compile(r"\b\d{2}:\d{2}:\d{2} [+-]\d{4}\b")
NUM = re.compile(r"(?<![\w.])\d[\d,]*(?:\.\d+)?(?![\w])")


def deny_terms():
    p = env_path("LOG_DENY_LIST")
    if not p.exists():
        raise SystemExit("deny list missing (set LOG_DENY_LIST)")
    out = []
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        t = line.strip()
        if t and not t.startswith("#"):
            out.append((i, t))
    return out


class _Text(HTMLParser):
    """Visible text + text-bearing attributes + JSON-LD. Skips <style> and non-LD scripts."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.skip, self.in_ld = [], 0, False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "style" or (tag == "script" and a.get("type") != "application/ld+json"):
            self.skip += 1
        if tag == "script" and a.get("type") == "application/ld+json":
            self.in_ld = True
        for k in ("alt", "title", "aria-label", "content", "placeholder"):
            if a.get(k) and not (tag == "meta" and a.get("name") in ("viewport",) or a.get("charset")):
                self.parts.append(a[k])

    def handle_endtag(self, tag):
        if tag in ("style", "script") and self.skip:
            self.skip -= 1
        if tag == "script":
            self.in_ld = False

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def visible_text(markup):
    p = _Text()
    p.feed(markup)
    return re.sub(r"\s+", " ", " ".join(p.parts))


def allowed_numbers():
    ok = {"0", "100"}  # chart axis ends
    def add_from(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                add_from(k)
                add_from(v)
        elif isinstance(obj, list):
            for v in obj:
                add_from(v)
        elif isinstance(obj, bool) or obj is None:
            return
        elif isinstance(obj, (int, float)):
            ok.add(str(obj))
            ok.add(format(obj, ","))
        else:
            for m in NUM.finditer(str(obj)):
                ok.add(m.group(0))
            for m in re.finditer(r"\d+", str(obj)):
                ok.add(m.group(0))
                ok.add(str(int(m.group(0))))  # "09" in a sourced date also renders as day "9"
            for m in ISO.finditer(str(obj)):
                ok.add(m.group(1))
    for f in sorted(DATA.glob("*.json")):
        add_from(json.loads(f.read_text(encoding="utf-8")))
    for e in load_entries():
        add_from({k: e[k] for k in ("date", "sources")})
        add_from([n["value"] for n in e.get("numbers", [])])
    # date parts render as 20 Sep 2026; month day numbers 1..31 come from real dates only
    return {n.replace(",", "") for n in ok} | ok


def check_text(text, label, deny, nums=None, findings=None):
    findings = [] if findings is None else findings
    low = text.lower()
    for ln, term in deny:
        tl = term.lower()
        pat = r"(?<![a-z0-9])" + re.escape(tl) + r"(?![a-z0-9])"
        if re.search(pat, low):
            findings.append((label, "deny", "deny-list line %d" % ln))
    for kind, rx in RX:
        for m in rx.finditer(text):
            s = m.group(0)
            if kind == "email" and s.lower() in PUBLIC_EMAILS:
                continue
            findings.append((label, kind, s[:40]))
    for b in ALLOW["banned_phrases"]:
        if re.search(r"(?<![a-z])" + re.escape(b.lower()) + r"(?![a-z])", low):
            findings.append((label, "banned", b))
    for m in DASHES.finditer(text):
        findings.append((label, "dash", "U+%04X" % ord(m.group(0))))
    if nums is not None:
        text = re.sub(r"(\d)(px|h|K|M)\b", r"\1 \2", URL.sub(" ", text))
        for m in ISO.finditer(text):
            if m.group(1) not in nums:
                findings.append((label, "number", m.group(1)))
        text = RFC_TIME.sub(" ", ISO.sub(" ", text))
        for m in NUM.finditer(text):
            tok = m.group(0).rstrip(",")
            if tok not in nums and tok.replace(",", "") not in nums:
                findings.append((label, "number", tok))
    return findings


def check_budgets(e, findings):
    b = ALLOW["budgets"]
    tw = len(e["title"].split())
    if tw > b["title_words"]:
        findings.append((e["slug"], "budget", "title %d words" % tw))
    total = 0
    for f in ("what_changed", "why_it_matters", "result", "lesson"):
        n = words(e.get(f, ""))
        total += n
        if n > b[f]:
            findings.append((e["slug"], "budget", "%s %d > %d" % (f, n, b[f])))
    if total > b["total_hard"]:
        findings.append((e["slug"], "budget", "total %d > %d" % (total, b["total_hard"])))
    return total


def scan_site():
    deny = deny_terms()
    nums = allowed_numbers()
    findings, scanned = [], []
    targets = sorted(p for p in LOG.rglob("*") if p.is_file() and p.suffix in (".html", ".xml", ".json"))
    for p in targets:
        raw = p.read_text(encoding="utf-8")
        rel = "/" + str(p.relative_to(SITE))
        if p.suffix == ".html":
            text = visible_text(raw)
        elif p.suffix == ".xml":
            text = visible_text(html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", " ", raw)))
        else:
            text = raw if "/data/" in rel else visible_text(json.dumps(json.loads(raw), ensure_ascii=False))
        # numbers: page copy only (data JSON is the number source itself)
        check_text(text, rel, deny, nums if p.suffix != ".json" or "/data/" not in rel else None, findings)
        scanned.append(rel)
    home = (SITE / "index.html").read_text(encoding="utf-8")
    m = re.search(r'<section[^>]*id="build-log".*?</section>', home, re.S)
    if m:
        check_text(visible_text(m.group(0)), "/index.html#build-log", deny, nums, findings)
        scanned.append("/index.html#build-log")
    totals = {}
    for e in load_entries():
        totals[e["slug"]] = check_budgets(e, findings)
    return scanned, findings, totals


FIXTURE = [
    ("unix home path", "Config lives in ~/.hermes/config.yaml today."),
    ("absolute path", "Logs are under /home/someone/logs/run.log."),
    ("opt path", "The pipeline reads /opt/app/data.db nightly."),
    ("windows path", "Copied from C:\\Users\\me\\Desktop\\notes.txt last week."),
    ("ipv4", "The server answers on 10.0.0.12 inside the network."),
    ("ipv6", "Reachable at 2001:db8:85a3::8a2e:370:7334 over v6."),
    ("email", "Write to someone.private@example.org for access."),
    ("port", "The gateway listens on localhost:8080 for calls."),
    ("port words", "Open port 8443 on the firewall first."),
    ("bearer", "Header was Bearer abcdef1234567890xyz in the log."),
    ("api key", "Key sk-live_ABCDEF1234567890abcd was rotated."),
    ("github pat", "Token github_pat_11ABCDEFG0123456789_xyz leaked."),
    ("snowflake", "Channel 123456789012345678 received the alert."),
    ("telegram token", "Bot 123456789:AAHf3kLmNoPqRsTuVwXyZ0123456789abcd started."),
    ("currency symbol", "The server cost \u20b9 1,840 in September."),
    ("currency code", "Billing came to INR 2300 for the month."),
    ("banned phrase", "The estate is fully autonomous now."),
    ("em dash", "Shipped the gateway \u2014 then the sync service."),
    ("unsourced number", "The agents finished 47 tasks overnight."),
    ("deny-list term", None),  # filled at runtime from the private list, never stored in the repo
]


def run_fixture():
    deny = deny_terms()
    nums = allowed_numbers()
    rows, caught = [], 0
    for name, text in FIXTURE:
        if text is None:
            text = "This mentions %s in passing." % deny[0][1]
        f = check_text(text, name, deny, nums)
        ok = bool(f)
        caught += ok
        rows.append("%-18s %s  %s" % (name, "CAUGHT" if ok else "MISSED", ",".join(sorted({k for _, k, _ in f}))))
    fp = []
    for e in load_entries():
        for field in ("title", "what_changed", "why_it_matters", "result", "lesson"):
            fp += check_text(e.get(field, ""), "%s.%s" % (e["slug"], field), deny, nums)
    for r in rows:
        print(r)
    print("planted=%d caught=%d missed=%d" % (len(FIXTURE), caught, len(FIXTURE) - caught))
    print("false positives on example entries: %d" % len(fp))
    for x in fp:
        print("  FP", x)
    return caught == len(FIXTURE) and not fp


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixture", action="store_true")
    a = ap.parse_args(argv)
    if a.fixture:
        sys.exit(0 if run_fixture() else 1)
    scanned, findings, totals = scan_site()
    print("privacy_gate: scanned %d targets" % len(scanned))
    for s in scanned:
        print("  ", s)
    for slug, t in sorted(totals.items()):
        print("  words %s total=%d" % (slug, t))
    for f in findings:
        print("FAIL", *f)
    print("privacy_gate: %s (%d findings)" % ("PASS" if not findings else "FAIL", len(findings)))
    sys.exit(0 if not findings else 1)


if __name__ == "__main__":
    main()
