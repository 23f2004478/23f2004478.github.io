"""Step 2: facts bundle for the next release + empty entry template.

Collects public ledger milestones dated after the last release tag (git tag log-release-*)
and any kanban cards listed in LOG_KANBAN_PUB (optional json list of
{id, title, status, duration_hours, tags}; only cards tagged "pub" pass). Only allowlisted
fields are written. Also verifies that every number in an existing entry maps to a source.

Usage
  python3 tools/log/build_log_entry.py bundle --slug my-slug --date 2026-10-08
  python3 tools/log/build_log_entry.py check        # number -> tag -> evidence check, all entries
"""
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import miniyaml  # noqa: E402
from common import ENTRIES, SITE, TAG_RE, TOOLS, env_path, load_entries, read_json, read_ledger, write_json  # noqa: E402

ALLOW = miniyaml.load(TOOLS / "publish_allowlist.yaml")
FLAGS = miniyaml.load(TOOLS / "ledger_public_flags.yaml")
WORK = Path(os.environ.get("LOG_WORK_ROOT") or Path.home() / "workhorse/krishnendu-me")


def last_release_date():
    try:
        tags = subprocess.check_output(["git", "-C", str(SITE), "tag", "--list", "log-release-*"], text=True).split()
    except subprocess.CalledProcessError:
        tags = []
    return max((t[len("log-release-"):] for t in tags), default="0000-00-00")


def ledger_since(since):
    out = []
    for row in read_ledger():
        f = FLAGS.get(row["id"])
        if f is None:
            raise SystemExit("ledger id %s has no explicit public flag" % row["id"])
        if not f.get("public") or row.get("public") is False:
            continue
        if row["ts"][:10] <= since:
            continue
        rec = {"id": row["id"], "ts": row["ts"], "precision": row.get("precision"),
               "public_title": f["public_title"], "category": f["category"]}
        out.append({k: rec[k] for k in ALLOW["ledger"]["fields"] if k in rec})
    return out


def kanban_pub():
    p = os.environ.get("LOG_KANBAN_PUB")
    if not p or not Path(p).exists():
        return []
    keep = ALLOW["kanban"]["fields"]
    return [{k: c[k] for k in keep if k in c} for c in read_json(p) if ALLOW["kanban"]["require_tag"] in (c.get("tags") or [])]


TEMPLATE = {"slug": "", "date": "", "title": "", "status": "shipped", "category": "",
            "what_changed": "", "why_it_matters": "", "result": "", "lesson": "",
            "diagram": {"template": "pipeline", "title": "", "desc": "", "steps": [], "accent_step": 0,
                        "loop_from": 0, "loop_to": 0, "loop_label": "", "caption": ""},
            "sources": [], "numbers": []}


def bundle(slug, date):
    since = last_release_date()
    facts = {"since": since, "ledger": ledger_since(since), "kanban": kanban_pub(),
             "rules": "Draft only from these facts. No new numbers. Every number needs a tag and an evidence row."}
    d = ENTRIES / ("%s-%s" % (date, slug))
    write_json(d / "facts.json", facts)
    if not (d / "entry.json").exists():
        t = dict(TEMPLATE, slug=slug, date=date)
        write_json(d / "entry.json", t)
    print("bundle:", d / "facts.json", "ledger=%d kanban=%d since=%s" % (len(facts["ledger"]), len(facts["kanban"]), since))


NUM = re.compile(r"(?<![\w.:])\d[\d,]*(?:\.\d+)?(?![\w])")
DAY_MONTH = re.compile(r"\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b")


def resolve(path):
    if path.startswith("SITE:"):
        return SITE / path[5:]
    if path.startswith("WORK:"):
        return WORK / path[5:]
    raise ValueError(path)


def check():
    """Every number in entry copy -> a numbers[] row with a source tag listed in sources[] and
    evidence that exists (ledger row for G: tags, file+pattern for others)."""
    ledger = {r["id"]: r for r in read_ledger()}
    bad, rows = 0, []
    for e in load_entries():
        tags = {s["tag"] for s in e["sources"]}
        byval = {}
        for n in e.get("numbers", []):
            byval.setdefault(n["value"], []).append(n)
        for field in ("title", "what_changed", "why_it_matters", "result", "lesson"):
            text = re.sub(r"(\d)(px|h|K|M)\b", r"\1 \2", TAG_RE.sub(" ", e.get(field, "")))
            found = []
            for m in DAY_MONTH.finditer(text):
                found.append(m.group(0))
            text2 = DAY_MONTH.sub(" ", text)
            text2 = re.sub(r"\b(?:Gemini|Opus|Sonnet|Haiku) (\d+(?:\.\d+)?)", lambda m: " v%s " % m.group(1), text2)
            for m in re.finditer(r" v(\d+(?:\.\d+)?) ", text2):
                found.append(m.group(1))
            text2 = re.sub(r" v\d+(?:\.\d+)? ", " ", text2)
            found += [m.group(0) for m in NUM.finditer(text2)]
            for tok in found:
                cands = byval.get(tok, [])
                dm = DAY_MONTH.fullmatch(tok)
                if not cands and dm:
                    # dates: must equal a cited ledger row date, or a numbers row
                    d, mon, y = dm.groups()
                    iso = "%s-%02d-%02d" % (y, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].index(mon) + 1, int(d))
                    hit = sorted(t for t in tags if t.startswith("G:") and ledger.get(t, {}).get("ts", "")[:10] == iso)
                    if hit:
                        rows.append((e["slug"], field, tok, hit[0], "ledger ts %s" % iso, "ok"))
                        continue
                if not cands:
                    rows.append((e["slug"], field, tok, "-", "-", "NO SOURCE"))
                    bad += 1
                    continue
                n = cands[0]
                ok, ev = _evidence(n, tags, ledger)
                rows.append((e["slug"], field, tok, n["tag"], ev, "ok" if ok else "FAIL"))
                bad += 0 if ok else 1
    for r in rows:
        print("%-24s %-15s %-12s %-13s %-60s %s" % r)
    print("numbers checked=%d failures=%d" % (len(rows), bad))
    return bad == 0


def _evidence(n, tags, ledger):
    if n["tag"] not in tags:
        return False, "tag %s not in sources" % n["tag"]
    ev = n.get("evidence")
    if n["tag"].startswith("G:") and not ev:
        return n["tag"] in ledger, "ledger row %s" % n["tag"]
    if not isinstance(ev, dict):
        return False, "no evidence"
    p = resolve(ev["file"])
    if not p.exists():
        return False, "missing %s" % ev["file"]
    for i, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if ev["pattern"] in line:
            return True, "%s:%d" % (ev["file"].split(":", 1)[1], i)
    return False, "pattern not found in %s" % ev["file"]


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bundle")
    b.add_argument("--slug", required=True)
    b.add_argument("--date", required=True)
    sub.add_parser("check")
    a = ap.parse_args(argv)
    if a.cmd == "bundle":
        bundle(a.slug, a.date)
    else:
        sys.exit(0 if check() else 1)


if __name__ == "__main__":
    main()
