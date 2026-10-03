"""Shared paths and helpers for the build log tooling.

Environment (all optional except where a script says otherwise):
  LOG_STATS_RAW   dir with strip.json, topology.json, modelmix.json, timeline.json (staged aggregates)
  LOG_DENY_LIST   deny list file, kept outside the repo
  LOG_LEDGER      public ledger jsonl (pre-filtered stubs for private rows)
  LOG_FACTS_MAP   site facts map csv (number -> source file + line)
  LOG_OUT         directory outside the repo for reports, packets and screenshots
"""
import json
import os
import re
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
SITE = TOOLS.parent.parent
LOG = SITE / "log"
DATA = LOG / "data"
ENTRIES = TOOLS / "entries"
SITE_URL = "https://krishnendu.me"
TZ = "+05:30"

HOME = Path.home()
DEFAULTS = {
    "LOG_STATS_RAW": HOME / "workhorse/krishnendu-me/inputs/log/stats_raw",
    "LOG_DENY_LIST": HOME / "workhorse/krishnendu-me/private/deny_list.txt",
    "LOG_LEDGER": HOME / "workhorse/krishnendu-me/inputs/log/genesis.public.jsonl",
    "LOG_FACTS_MAP": HOME / "workhorse/krishnendu-me/inputs/log/facts_map.csv",
    "LOG_OUT": HOME / "workhorse/krishnendu-me/log",
}


def env_path(name):
    return Path(os.environ.get(name) or DEFAULTS[name]).expanduser()


def read_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def write_json(p, obj):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, sort_keys=True, ensure_ascii=False)
        f.write("\n")


def read_ledger(path=None):
    path = path or env_path("LOG_LEDGER")
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


TAG_RE = re.compile(r"\[([GKTD]):([A-Za-z0-9_\-]+)\]")


def strip_tags(text):
    return re.sub(r"\s*" + TAG_RE.pattern, "", text)


def words(text):
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'.,:;()\-/]*", strip_tags(text)))


MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]


def human_date(iso):
    y, m, d = iso[:10].split("-")
    return "%d %s %s" % (int(d), MONTHS[int(m) - 1], y)


def load_entries():
    out = []
    for d in sorted(ENTRIES.iterdir()):
        f = d / "entry.json"
        if f.exists():
            e = read_json(f)
            e["_dir"] = str(d)
            out.append(e)
    out.sort(key=lambda e: (e["date"], e["slug"]), reverse=True)
    return out


def entry_url(e):
    return "/log/%s/%s/%s/" % (e["date"][:4], e["date"][5:7], e["slug"])
