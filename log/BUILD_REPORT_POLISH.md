# Build report: home polish (t_39029ddf)

Base: origin/main @ f1f0641. Branch: log-preview (not pushed to main).
Model: claude-sonnet-5[1m] (provider claude-subscription-directsdk-experimental).
Date: 5 Oct 2026.

## Scope
Continuation of t_d78b5aad after f1f0641 went live. Five required fixes below.
No copy, figures, or stat-strip numbers changed. Confirmed by diff: only
`index.html` (hero diagram coordinates + regenerated build-log card, which
is byte-identical to the prior card since content.json entries did not
change), `styles.css` (two rules), `log/feed.xml` (regenerated),
`tools/log/render_log.py` (one function) were touched.

## 1. feed.xml date format
Root cause: `tools/log/render_log.py` `rfc822()` used `%02d` for the day,
giving "Sat, 03 Oct 2026" in `<pubDate>` and `<lastBuildDate>`, while every
other date on the site (home, log pages, feed.json, JSON-LD) already used
`common.human_date()`, which has no leading zero ("3 Oct 2026"). Changed
`%02d` to `%d` in `rfc822()` and regenerated via `python3 tools/log/render_log.py`.
RFC 2822 permits 1 or 2 digit day-of-month, so this stays a valid feed date.

Verified:
`log/feed.xml` now reads `<lastBuildDate>Sat, 3 Oct 2026 20:00:00 +0530</lastBuildDate>`
and `<pubDate>Sat, 3 Oct 2026 20:00:00 +0530</pubDate>` /
`<pubDate>Sun, 20 Sep 2026 20:00:00 +0530</pubDate>`. No other file changed
by the regeneration except feed.xml (checked with `git status --short`).

## 2. Case-study description contrast
Measured with the actual rendered CSS color values (not estimated), sRGB
relative-luminance formula (WCAG 2.x):

- Light mode: body text `rgb(90, 87, 80)` on background `rgb(247, 244, 238)`
  -> contrast ratio 6.57:1 (threshold 4.5:1, pass, 1.46x margin).
- Dark mode: body text `rgb(173, 167, 157)` on background `rgb(21, 21, 20)`
  -> contrast ratio 7.65:1 (pass, 1.70x margin).

Both already passed on the live f1f0641 build measured before any change in
this task; no CSS color value needed to change. Reported here per the
verification requirement. Script: `~/workhorse/krishnendu-me/contrast_check.py`.

## 3. "All case studies" vs "Build log" line separation
Root cause: `.log-line{margin-top:var(--s6)}` (24px) was the only
separation between the case-study section and the build-log line, and the
build-log section's own `<h2>` is screen-reader-only, so it got none of the
`section+section h2{margin-top:var(--sec)}` rhythm every other section
boundary uses. Changed to
`.log-line{margin-top:var(--s12);padding-top:var(--s6);border-top:1px solid var(--rule)}`
in styles.css: doubles the top margin (24px -> 48px measured in the
browser), adds an 8px internal pad before the text, and a hairline rule so
the boundary reads as a new block rather than a continuation of the rows
list, matching the `.entry{border-top:...}` pattern used elsewhere on the
page.

Measured (fresh DOM query, light and dark unaffected since it is layout not
color): gap from the bottom of the "All case studies" link to the top of
the "Build log, 3 Oct 2026" line = 48px (was 24px before this change).

## 4. Case-study list: equal gaps, one title weight
Measured the 6 `<li>` in `#agent-systems ul.rows` with
`getBoundingClientRect()`: bounding-box gap between every consecutive pair
is 0px, meaning each row's whitespace comes entirely from the row's own
`padding: var(--s4) 0` (16px top, 16px bottom) plus its `border-top`, which
is identical for every row by one shared CSS rule (`.rows li`). There is no
per-item override, so the rendered spacing is already structurally equal:
[0, 0, 0, 0, 0] px between the 6 items, confirmed on both the pre-change
live build and this build (no regression, no fix needed here).
`getComputedStyle(h3).fontWeight` returned `600` for all 6 titles, one
weight, confirmed likewise unaffected. No CSS change made for this item;
reported per the verification requirement.

## 5. Hero diagram: even node spacing
Root cause: the approval-flow SVG in the hero figure used arbitrary
y-coordinates accumulated over several prior edits. Measured edge length
(node bottom to next node top) on the live f1f0641 build: 18, 18, 26, 50,
102, 20 px, i.e. the gap around the review-gate node was 5-6x the smallest
gap.

Fix: rewrote the y-coordinates of every rect/path/text/circle in the
diagram (text content, box widths, box x-positions and classes all
unchanged) so every node-to-node edge is a uniform 20px within the
unchanged viewBox (`0 0 400 524`). Compound nodes (the 3-way domain-profile
row with its caption, and the review-gate bar with its two labels) keep
their internal layout, only their outer edges moved to land on the uniform
20px rhythm. Updated the dot travel-animation custom properties
(`--from`/`--to`) to match the gate's new resting y so the authored
entrance motion still starts at the first node and ends at the last.

Verified: box-group y-tops now at 4, 64, 124, 184, 270, 420, 480 with
inter-node edges of 20, 20, 20 (+label), 20 (+gate), 20 px -- all raw gaps
above 20 are accounted for by a node's own internal content (the
"domain profiles" caption or the review-gate bar/labels), not uneven
spacing. Screenshot-checked at 1440 and 390 (see `log/polish_shots/`).
`svg_measure.mjs` confirms no text dropped below the 13px floor on the home
page at 360/390/1440 (min 13.1px, 0 overflow) after the coordinate change.

## Gates run (this branch, after all fixes, from repo root)
- `python3 tools/log/test_log.py`: 7/7 tests OK.
- `python3 tools/log/privacy_gate.py`: PASS (0 findings), 13 targets scanned.
- `node ~/.hermes/tools/svg_measure.mjs .`: 27 pages x 3 widths = 81 rows,
  0 fails (min text size and 0 horizontal overflow everywhere, including
  the home page at 13.1px min after the diagram edit).
- `python3 ~/.hermes/tools/fullsite_gate.py 3d75976b876f2d7ef082a02cf5fc6559`:
  resume md5 matches `3d75976b876f2d7ef082a02cf5fc6559` (OK), 0 broken
  internal links, 0 invalid JSON-LD, 0 dashes, 0 autonomous-word hits on the
  checked list, strip caption intact, home headline/CTA copy intact.
  Two pre-existing findings are unchanged from the f1f0641 baseline and are
  **not** introduced by this task (confirmed by running the same gate
  against the unmodified f1f0641 tree via `git stash`): a banned-number hit
  in `credentials/index.html` ("349/730/751" pattern) and the
  `home has '35 recurring jobs running on 12 agent pr': False` check, which
  is a false positive caused by the proof number and its label living in
  separate `<dt>`/`<dd>` tags (the actual visible text is correct and
  unchanged: "35" / "recurring jobs running on 12 agent profiles"). Neither
  is in this task's required-fix list and neither was touched.
- `bash .../personal-website-github-pages/scripts/fact_gate.sh .`: same
  findings on this branch as on the unmodified f1f0641 baseline (verified
  by `git stash` comparison) -- nothing newly introduced.

## Screenshots (fresh, this build, over local http on port 8843)
All in `~/workhorse/krishnendu-me/log/polish_shots/`:
- `desktop_1440_hero.png` -- hero + diagram, 1440 width
- `desktop_1440_buildlog.png` -- case-study list + build-log separation, 1440
- `mobile_390_hero.png` -- hero, 390 width
- `mobile_390_diagram.png` -- diagram, 390 width
- `mobile_390_buildlog.png` -- case-study list + build-log separation, 390

## Not changed
Hero copy, proof-strip numbers, case-study titles/descriptions, internship
and research content, all `<title>`/meta text. Confirmed by `git diff`
scope: only `index.html` (diagram coordinates + routine build-log
regeneration), `styles.css` (2 rules), `log/feed.xml` (regenerated),
`tools/log/render_log.py` (1 function).
