"""Steps 6, 9, 10, 11: release state machine for the build log. Git only, no history rewrite.

  preview  [--date D]           snapshot, render, gate, commit on branch preview/<D>, push that branch only
  approve  --date D             record owner approval (writes tools/log/releases/<D>.json, commits on preview/<D>)
  edit     --date D --entry SLUG --field F --text T
                                apply an owner edit to one field, then rerun render + gates (no redraft)
  reject   --date D --reason R  record rejection and the reason as a lesson candidate; nothing publishes
  publish  --date D             fast-forward main to preview/<D>; refuses unless approved and ff-possible
  rollback --date D             git revert of the published range on main, pushed as a new commit

Publish never force-pushes. Rollback never resets. Exit non-zero on any refusal.
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ENTRIES, SITE, TOOLS, load_entries, write_json  # noqa: E402

IST = timezone(timedelta(hours=5, minutes=30))
REL = TOOLS / "releases"


def git(*args, check=True):
    r = subprocess.run(["git", "-C", str(SITE), *args], text=True, capture_output=True)
    if check and r.returncode:
        raise SystemExit("git %s failed: %s" % (" ".join(args), r.stderr.strip()[:400]))
    return r.stdout.strip()


def py(script, *args):
    r = subprocess.run([sys.executable, str(TOOLS / script), *args], text=True, capture_output=True)
    print(r.stdout.strip()[-1500:])
    if r.returncode:
        print(r.stderr.strip()[-800:])
    return r.returncode


def gates():
    rc = 0
    rc |= py("stats_snapshot.py")
    rc |= py("render_log.py")
    rc |= py("privacy_gate.py")
    rc |= py("build_log_entry.py", "check")
    return rc == 0


def branch(d):
    return "preview/%s" % d


def state(d):
    p = REL / ("%s.json" % d)
    return json.loads(p.read_text()) if p.exists() else {"date": d, "status": "draft", "events": []}


def save(d, st, event):
    st["events"].append({"at": datetime.now(IST).isoformat(timespec="seconds"), **event})
    write_json(REL / ("%s.json" % d), st)


def commit(msg):
    # Stage only the log surface and pages the renderer touches; .gitignore keeps bytecode out.
    git("add", "-A", "log", "tools/log", "index.html", "styles.css", "sitemap.xml")
    git("add", "-u")  # nav link edits on existing pages, tracked files only
    staged = git("diff", "--cached", "--name-only", check=False).split()
    leaked = [f for f in staged if f.endswith((".pyc", ".pyo")) or "__pycache__" in f]
    if leaked:
        raise SystemExit("refusing to commit bytecode: %s" % leaked[:3])
    if staged:
        git("commit", "-q", "-m", msg)


def cmd_preview(a):
    d = a.date or datetime.now(IST).date().isoformat()
    cur = git("rev-parse", "--abbrev-ref", "HEAD")
    if cur != branch(d):
        git("checkout", "-q", "-B", branch(d))
    if not gates():
        raise SystemExit("gates failed; nothing committed")
    st = state(d)
    st["status"] = "preview"
    save(d, st, {"action": "preview", "entries": [e["slug"] for e in load_entries()]})
    commit("log: preview %s" % d)
    if a.push:
        git("push", "-q", "origin", "%s:refs/heads/%s" % (branch(d), branch(d)))
    print("preview ready on", branch(d), git("rev-parse", "--short", "HEAD"))


def cmd_approve(a):
    st = state(a.date)
    if st["status"] not in ("preview", "edited"):
        raise SystemExit("nothing to approve (status %s)" % st["status"])
    st["status"] = "approved"
    st["approved_sha"] = git("rev-parse", "HEAD")
    save(a.date, st, {"action": "approve", "by": "owner"})
    commit("log: approved %s" % a.date)


def cmd_edit(a):
    hits = [d for d in ENTRIES.iterdir() if d.name.endswith("-" + a.entry)]
    if len(hits) != 1:
        raise SystemExit("entry not found: %s" % a.entry)
    p = hits[0] / "entry.json"
    e = json.loads(p.read_text())
    if a.field not in ("title", "what_changed", "why_it_matters", "result", "lesson"):
        raise SystemExit("field not editable: %s" % a.field)
    old = e[a.field]
    e[a.field] = a.text
    write_json(p, e)
    if not gates():
        e[a.field] = old
        write_json(p, e)
        gates()
        raise SystemExit("edit fails the gates; reverted")
    st = state(a.date)
    st["status"] = "edited"
    save(a.date, st, {"action": "edit", "entry": a.entry, "field": a.field})
    commit("log: owner edit %s.%s" % (a.entry, a.field))


def cmd_reject(a):
    st = state(a.date)
    st["status"] = "rejected"
    save(a.date, st, {"action": "reject", "reason": a.reason, "lesson_candidate": True})
    commit("log: rejected %s" % a.date)


def cmd_publish(a):
    st = state(a.date)
    if st["status"] != "approved":
        raise SystemExit("refusing: release %s is %s, not approved" % (a.date, st["status"]))
    git("fetch", "-q", "origin", "main")
    head = git("rev-parse", branch(a.date))
    if subprocess.run(["git", "-C", str(SITE), "merge-base", "--is-ancestor", "origin/main", head]).returncode:
        raise SystemExit("refusing: origin/main is not an ancestor of %s (not fast-forward)" % branch(a.date))
    base = git("rev-parse", "origin/main")
    git("push", "-q", "origin", "%s:refs/heads/main" % head)  # plain push: the remote rejects non-ff
    git("tag", "-f", "log-release-%s" % a.date, head)
    git("push", "-q", "origin", "refs/tags/log-release-%s" % a.date)
    st["status"] = "published"
    st["published"] = {"from": base, "to": head}
    write_json(REL / ("%s.json" % a.date), st)
    print("published %s..%s" % (base[:7], head[:7]))


def cmd_rollback(a):
    st = state(a.date)
    pub = st.get("published")
    if not pub:
        raise SystemExit("refusing: %s was never published" % a.date)
    git("fetch", "-q", "origin", "main")
    git("checkout", "-q", "-B", "rollback/%s" % a.date, "origin/main")
    git("revert", "--no-edit", "%s..%s" % (pub["from"], pub["to"]))
    git("push", "-q", "origin", "HEAD:refs/heads/main")
    print("reverted %s..%s on main" % (pub["from"][:7], pub["to"][:7]))


def main(argv=None):
    ap = argparse.ArgumentParser()
    s = ap.add_subparsers(dest="cmd", required=True)
    p = s.add_parser("preview")
    p.add_argument("--date")
    p.add_argument("--push", action="store_true")
    p = s.add_parser("approve")
    p.add_argument("--date", required=True)
    p = s.add_parser("edit")
    p.add_argument("--date", required=True)
    p.add_argument("--entry", required=True)
    p.add_argument("--field", required=True)
    p.add_argument("--text", required=True)
    p = s.add_parser("reject")
    p.add_argument("--date", required=True)
    p.add_argument("--reason", required=True)
    for n in ("publish", "rollback"):
        p = s.add_parser(n)
        p.add_argument("--date", required=True)
    a = ap.parse_args(argv)
    globals()["cmd_" + a.cmd](a)


if __name__ == "__main__":
    main()
