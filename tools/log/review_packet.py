"""Step 8: owner review packet (markdown, under 600 words) + screenshots at 390 and 1440.

Writes to LOG_OUT/packet_<date>/ (outside the repo): packet.md and the PNGs.
Usage: python3 tools/log/review_packet.py [--date D] [--prev-strip PATH] [--model-line "..."]
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, env_path, load_entries, read_json, strip_tags, words  # noqa: E402

CHECKS = [
    "Indirect disclosure: could any number or label point to one client, person or institution?",
    "Timing: does any date reveal an institute or committee deadline?",
    "Diagram labels: anything private, internal or unclear in the figures?",
    "Third parties: does any lesson embarrass or blame someone outside the estate?",
]


def strip_diff(prev, cur):
    old = {c["key"]: c["value"] for c in (prev or {}).get("cells", [])}
    rows = ["| Cell | Before | Now |", "|---|---|---|"]
    for c in cur["cells"]:
        rows.append("| %s | %s | %s |" % (c["label"], old.get(c["key"], "none"), c["value"]))
    return "\n".join(rows)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=date.today().isoformat())
    ap.add_argument("--prev-strip")
    ap.add_argument("--model-line", default="(paste: grep 'API call #' agent.log | grep -o 'model=[^ ]*' | sort | uniq -c)")
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args(argv)
    out = env_path("LOG_OUT") / ("packet_%s" % a.date)
    out.mkdir(parents=True, exist_ok=True)
    shots = []
    if not a.no_shots:
        import shots as S
        res = S.run(out, ["/log/"] + ["/log/%s/%s/%s/" % (e["date"][:4], e["date"][5:7], e["slug"]) for e in load_entries()[:1]])
        shots = [r["shot"] for r in res]
    cur = read_json(DATA / "strip.json")
    prev = read_json(a.prev_strip) if a.prev_strip else None
    parts = ["# Build log review, %s" % a.date, "",
             "Reply with one of: approve | edit: <entry>.<field>: <text> | reject: <reason>", "",
             "## Screenshots", ""] + ["- %s" % s for s in shots] + ["", "## This week strip", "", strip_diff(prev, cur), ""]
    tags = set()
    for e in load_entries():
        parts += ["## %s (%s)" % (e["title"], e["date"]), ""]
        for f in ("what_changed", "why_it_matters", "result", "lesson"):
            if e.get(f):
                parts.append("%s: %s" % (f.replace("_", " ").capitalize(), strip_tags(e[f])))
                tags |= set(re.findall(r"\[([GKTD]:[^\]]+)\]", e[f]))
        parts.append("")
    parts += ["## Source tags", "", ", ".join(sorted(tags)), "", "## Check by hand (yes or no)", ""]
    parts += ["- [ ] %s" % c for c in CHECKS]
    parts += ["", "## Model line", "", "    " + a.model_line, ""]
    text = "\n".join(parts)
    n = words(text)
    (out / "packet.md").write_text(text, encoding="utf-8")
    print("packet:", out / "packet.md", "words=%d" % n, "shots=%d" % len(shots))
    if n > 600:
        print("REJECT: packet over 600 words")
        sys.exit(1)


if __name__ == "__main__":
    main()
