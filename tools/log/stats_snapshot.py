"""Step 1: staged aggregates -> /log/data/*.json (allowlisted fields only).

Reads LOG_STATS_RAW (strip.json, topology.json, modelmix.json, timeline.json) and the
public ledger (LOG_LEDGER) filtered by ledger_public_flags.yaml. The staging script on the
coordinator side reads the per-profile databases; this script never touches them.

Deterministic: same inputs give byte-identical output. Missing source -> "not measured".
Usage: python3 tools/log/stats_snapshot.py [--out DIR]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import miniyaml  # noqa: E402
from common import DATA, TOOLS, env_path, read_json, read_ledger, write_json  # noqa: E402

NM = "not measured"

# Display names for raw model ids. Unknown ids are shown exactly as logged.
MODEL_NAMES = {
    "claude-opus-5-5[1m]": "Opus 5.5",
    "claude-opus-5-5": "Opus 5.5",
    "claude-sonnet-5[1m]": "Sonnet 5",
    "claude-sonnet-5": "Sonnet 5",
    "ag/claude-sonnet-4-6": "Sonnet 4.6",
    "claude-sonnet-4-6": "Sonnet 4.6",
    "claude-haiku-4-5": "Haiku 4.5",
    "ag/gemini-3.7-flash-high": "Gemini 3.7 Flash (high)",
    "ag/gemini-3.7-flash-medium": "Gemini 3.7 Flash (medium)",
    "ag/gemini-3.6-flash-high": "Gemini 3.6 Flash (high)",
    "claude-sonnet-5-5": "Sonnet 5.5",
    "fable": "Fable",
}


def display_name(raw):
    return MODEL_NAMES.get(raw, raw)


def _load(raw_dir, name):
    p = Path(raw_dir) / (name + ".json")
    return read_json(p) if p.exists() else None


def _pick(d, keys):
    return {k: d[k] for k in keys if d is not None and k in d}


def pct_tenths(n, total):
    """Share in tenths of a percent, rounded half up, as an int (deterministic, no float drift)."""
    return (n * 1000 * 2 + total) // (2 * total) if total else 0


def axis_ticks(mx):
    """Zero-based ticks, 4 or 5 intervals, top tick >= max."""
    if mx <= 0:
        return [0, 1]
    mag = 10 ** (len(str(int(mx))) - 1)
    for step in (mag // 4 or 1, mag // 2 or 1, mag, mag * 2, int(mag * 2.5), mag * 5, mag * 10):
        n = -(-mx // step)
        if n <= 5:
            return [i * step for i in range(int(n) + 1)]
    return [0, mx]


def week_history(hist_path, modelmix, generated):
    """Append-or-replace this window into the weekly history file (keyed by window end date)."""
    end = generated[:10] if isinstance(generated, str) and generated != NM else None
    hist = read_json(hist_path) if Path(hist_path).exists() else {"weeks": []}
    if end and modelmix["models"]:
        by_name = {}
        for m in modelmix["models"]:
            by_name[m["name"]] = by_name.get(m["name"], 0) + m["calls"]
        hist["weeks"] = [w for w in hist["weeks"] if w["end"] != end] + [{"end": end, "calls_by_name": by_name}]
    hist["weeks"].sort(key=lambda w: w["end"])
    from datetime import date, timedelta
    last = date.fromisoformat(hist["weeks"][-1]["end"]) if hist["weeks"] else None
    hist["week_ends"] = [(last - timedelta(days=7 * i)).isoformat() for i in range(7, -1, -1)] if last else []
    names = []
    for w in hist["weeks"]:
        for n, _ in sorted(w["calls_by_name"].items(), key=lambda kv: -kv[1]):
            if n not in names:
                names.append(n)
    hist["names"] = names
    hist["weeks_shown"] = len(hist["week_ends"])
    hist["weeks_measured"] = len([w for w in hist["weeks"] if w["end"] in hist["week_ends"]])
    return hist


def build(raw_dir, ledger_path, flags_path, allow_path):
    allow = miniyaml.load(allow_path)["stats_raw"]
    flags = miniyaml.load(flags_path)
    strip_raw = _pick(_load(raw_dir, "strip"), allow["strip"])
    topo_raw = _pick(_load(raw_dir, "topology"), allow["topology"])
    mix_raw = _pick(_load(raw_dir, "modelmix"), allow["modelmix"])
    tl_raw = _pick(_load(raw_dir, "timeline"), allow["timeline"])

    def cell(key, label, unit):
        v = strip_raw.get(key, NM) if strip_raw else NM
        return {"key": key, "label": label, "unit": unit, "value": v}

    calls = (mix_raw or {}).get("calls_by_model") or {}
    total = sum(calls.values())
    models = []
    for raw_id, n in sorted(calls.items(), key=lambda kv: (-kv[1], kv[0])):
        tenths = pct_tenths(n, total)
        share = "%d.%d" % divmod(tenths, 10) if n * 1000 >= total else "under 0.1"
        models.append({"id": raw_id, "name": display_name(raw_id), "calls": n, "share_pct": share})
    strip = {
        "window_days": (strip_raw or {}).get("window_days", NM),
        "generated": (strip_raw or {}).get("generated", NM),
        "cells": [
            cell("agent_runs", "Agent runs", "worker runs on the build board"),
            cell("active_build_hours", "Build hours", "hours of worker runs on the build board"),
            cell("tasks_shipped", "Tasks shipped", "cards moved to done on the build board"),
            {"key": "model_calls", "label": "Model calls", "unit": "calls across %d models" % len(models),
             "value": total if models else NM},
            cell("scheduled_jobs", "Scheduled jobs", "enabled jobs across agents"),
            cell("skills_unique", "Skills", "distinct skill folders, each a reusable step-by-step procedure"),
        ],
    }
    topology = {
        "router": (topo_raw or {}).get("router", NM),
        "profiles": list((topo_raw or {}).get("profiles", [])),
        "count_including_router": (topo_raw or {}).get("count_including_router", NM),
        "domain_profiles": len((topo_raw or {}).get("profiles", [])) or NM,
    }
    modelmix = {"window_days": (mix_raw or {}).get("window_days", NM), "total_calls": total if models else NM,
                "models": models, "axis_ticks": axis_ticks(max([m["calls"] for m in models] or [0]))}
    # Ledger dots: public flag true AND day or exact precision. Everything else renders nothing.
    ok_prec = set(miniyaml.load(allow_path)["ledger"]["timeline_precisions"])
    dots = []
    for row in read_ledger(ledger_path):
        f = flags.get(row["id"])
        if f is None:
            raise SystemExit("ledger id %s has no explicit public flag" % row["id"])
        if not f.get("public") or row.get("public") is False:
            continue
        if row.get("precision") not in ok_prec:
            continue
        dots.append({"id": row["id"], "date": row["ts"][:10], "category": f["category"],
                     "title": f["public_title"]})
    dots.sort(key=lambda d: (d["date"], d["id"]))
    timeline = {"ledger": dots, "runs_per_day": dict(sorted(((tl_raw or {}).get("runs_per_day") or {}).items())),
                "generated": strip["generated"], "days": 90}
    if isinstance(strip["generated"], str) and strip["generated"] != NM:
        from datetime import date, timedelta
        end = date.fromisoformat(strip["generated"][:10])
        start = end - timedelta(days=89)
        timeline["start"] = start.isoformat()
        timeline["ledger"] = [d for d in dots if start.isoformat() <= d["date"] <= end.isoformat()]
    timeline["dots"] = len(timeline["ledger"])
    return {"strip": strip, "topology": topology, "modelmix": modelmix, "timeline": timeline}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(DATA))
    ap.add_argument("--raw", default=None)
    a = ap.parse_args(argv)
    raw = a.raw or env_path("LOG_STATS_RAW")
    out = build(raw, env_path("LOG_LEDGER"), TOOLS / "ledger_public_flags.yaml", TOOLS / "publish_allowlist.yaml")
    hist_path = TOOLS / "history" / "modelmix_weeks.json"
    hist = week_history(hist_path, out["modelmix"], out["strip"]["generated"])
    if a.out == str(DATA):
        write_json(hist_path, {"weeks": hist["weeks"]})
    out["modelmix_weeks"] = hist
    for name, obj in out.items():
        write_json(Path(a.out) / (name + ".json"), obj)
    print("wrote", ", ".join(sorted(out)), "to", a.out)


if __name__ == "__main__":
    main()
