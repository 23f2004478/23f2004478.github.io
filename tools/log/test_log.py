"""Unit tests for the build log tooling. Run: python3 tools/log/test_log.py

Uses fixture stats in a temp dir (never the live staging dir) and checks determinism,
"not measured" on missing sources, allowlist filtering, ledger flag enforcement, and
that the privacy gate catches its 20 planted leaks.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import miniyaml  # noqa: E402
import stats_snapshot as SS  # noqa: E402

FLAGS = HERE / "ledger_public_flags.yaml"
ALLOW = HERE / "publish_allowlist.yaml"


def fixture(tmp, with_mix=True, extra_field=False):
    raw = Path(tmp) / "raw"
    raw.mkdir()
    strip = {"window_days": 7, "generated": "2026-10-03T22:45", "agent_runs": 5, "active_build_hours": 1.5,
             "tasks_shipped": 2, "skills_unique": 10, "scheduled_jobs": 3, "profiles_including_router": 4}
    if extra_field:
        strip["secret_session_title"] = "should never pass"
    (raw / "strip.json").write_text(json.dumps(strip))
    (raw / "topology.json").write_text(json.dumps({"router": "default (router)", "profiles": ["finance", "infra", "institute work, private"],
                                                   "count_including_router": 4, "channels": ["should-never-pass"]}))
    if with_mix:
        (raw / "modelmix.json").write_text(json.dumps({"window_days": 7, "calls_by_model": {"claude-opus-5-5[1m]": 30, "ag/claude-sonnet-4-6": 10},
                                                       "tokens_by_model": {"x": {"in": 1}}}))
    (raw / "timeline.json").write_text(json.dumps({"runs_per_day": {"2026-10-03": 3}}))
    ledger = Path(tmp) / "ledger.jsonl"
    rows = [{"id": "G:%04d" % i, "ts": "2026-09-2%d" % (i % 9), "precision": "day", "public": True, "event": "raw text never shown"}
            for i in range(1, 20)]
    rows[3] = {"id": "G:0004", "ts": "2026-09-11", "public": False}
    ledger.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    return raw, ledger


class Snapshot(unittest.TestCase):
    def test_deterministic_and_allowlisted(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, ledger = fixture(tmp, extra_field=True)
            a = json.dumps(SS.build(raw, ledger, FLAGS, ALLOW), sort_keys=True)
            b = json.dumps(SS.build(raw, ledger, FLAGS, ALLOW), sort_keys=True)
            self.assertEqual(a, b)
            self.assertNotIn("should never pass", a)
            self.assertNotIn("should-never-pass", a)
            self.assertNotIn("raw text never shown", a)
            self.assertNotIn("tokens_by_model", a)

    def test_not_measured(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, ledger = fixture(tmp, with_mix=False)
            out = SS.build(raw, ledger, FLAGS, ALLOW)
            cell = [c for c in out["strip"]["cells"] if c["key"] == "model_calls"][0]
            self.assertEqual(cell["value"], "not measured")
            self.assertEqual(out["modelmix"]["total_calls"], "not measured")

    def test_model_names_and_shares(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, ledger = fixture(tmp)
            mm = SS.build(raw, ledger, FLAGS, ALLOW)["modelmix"]
            self.assertEqual([m["name"] for m in mm["models"]], ["Opus 5.5", "Sonnet 4.6"])
            self.assertEqual([m["share_pct"] for m in mm["models"]], ["75.0", "25.0"])
            self.assertEqual(mm["axis_ticks"][0], 0)

    def test_private_rows_excluded(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, ledger = fixture(tmp)
            ids = [d["id"] for d in SS.build(raw, ledger, FLAGS, ALLOW)["timeline"]["ledger"]]
            for private in ("G:0004", "G:0008", "G:0013", "G:0014", "G:0017"):
                self.assertNotIn(private, ids)

    def test_every_ledger_id_flagged(self):
        flags = miniyaml.load(FLAGS)
        self.assertEqual(sorted(flags), ["G:%04d" % i for i in range(1, 20)])
        for k, v in flags.items():
            self.assertIn(v["public"], (True, False), k)

    def test_unflagged_id_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, ledger = fixture(tmp)
            with open(ledger, "a") as f:
                f.write(json.dumps({"id": "G:0099", "ts": "2026-10-01", "precision": "day", "public": True}) + "\n")
            with self.assertRaises(SystemExit):
                SS.build(raw, ledger, FLAGS, ALLOW)


class Gate(unittest.TestCase):
    def test_fixture_all_caught(self):
        r = subprocess.run([sys.executable, str(HERE / "privacy_gate.py"), "--fixture"], capture_output=True, text=True,
                           env=dict(os.environ))
        self.assertIn("planted=20 caught=20 missed=0", r.stdout)
        self.assertIn("false positives on example entries: 0", r.stdout)
        self.assertEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
