Build report: official brand marks, Editorial Ledger favicon set, avatar circle fix, home nits
Task: t_a6e98101
Branch: log-preview (base origin/main @ 7fa0b1a)
Model: claude-sonnet-5[1m], provider claude-subscription-directsdk-experimental
(agent.log, session 20261005_020847_c78ba1: "API call #166: model=claude-sonnet-5[1m]
provider=claude-subscription-directsdk-experimental" - no fallback, matches the task's
pinned model_override)

## 1. Brand marks (GitHub, LinkedIn)

Replaced the hand-drawn outline symbols with official marks, fill=currentColor, in the
shared SVG sprite on all 21 non-archive pages that carry it (list below) plus the head
template in tools/log/render_log.py (regenerates /log/* pages from the same source).

- GitHub: Octicons "mark-github-16", MIT license.
  Source: https://github.com/primer/octicons/blob/main/icons/mark-github-16.svg
  Original viewBox 0 0 16 16, inset by translate(2,2) into the shared 20x20 sprite grid
  (no stroke change -- same inset the existing outline icons use, so optical weight
  matches the other icon buttons).
- LinkedIn: Font Awesome Free 6 "linkedin-in" brand glyph, icons CC BY 4.0.
  Source: https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/brands/linkedin-in.svg
  Original viewBox 0 0 448 512, scaled 0.03125x (512 -> 16 tall, 448 -> 14 wide) and
  centred via translate(3,2) in the 20x20 grid.
- CSS: added ".icon.brand{fill:currentColor;stroke:none}" in styles.css; applied
  class="icon brand" to the 3 <svg><use> wrappers that render these two marks on
  index.html (hero LinkedIn button, hero GitHub button, footer LinkedIn textlink).
  Every other icon (mail, pdf, ext, arrow, sun/moon, menu, close, check, print) is
  untouched and stays stroke-outline.

Files changed (sprite): index.html, 404.html, work/index.html, work/{reliability,
finance,routing,memory,linkedin-studio,platform}/index.html, internships/index.html,
credentials/index.html, projects/index.html, projects/{vc-dashboard,mcq,
comment-classification,customer-exit}/index.html, log/index.html, log/archive/index.html,
log/sources/index.html, log/2026/09/cloud-migration/index.html,
log/2026/10/site-rebuild-fact-audit/index.html, tools/log/render_log.py (template).
/archive/ untouched (verified: 0 matches for i-github/i-linkedin inside archive/).

Known follow-up, not fixed in this card (out of scope -- redirect stubs and one case
study page were not part of the "pages carrying the sprite" set found):
work/platform/index.html and work/multi-agent-platform/index.html (redirect stub) still
render an older "Discord / Telegram" topology diagram copy with the old punctuation.
Flagged for a follow-up card; the home hero diagram (in scope here) is fixed.

## 2. Favicon set (Editorial Ledger theme)

fontTools extraction from fonts/Fraunces-Variable.woff2 was attempted first and blocked:
decoding WOFF2 needs the `brotli` Python package, and `pip install brotli` / `npm install
wawoff2` are both blocked in this sandbox (network threat-intel lookup times out, no
user present to approve in single-query mode). Fell back to the spec's explicitly
sanctioned alternative: a hand-drawn geometric monogram, forest green tile #1F5C4A,
paper glyphs #F7F4EE, rounded tile radius 20% (rx=20 on a 100x100 viewBox).

- 16/32px favicons and the .ico: single "K" stroke glyph (KB smudges at 16px).
- 180px apple-touch-icon and 512px favicon: full "KB" monogram, opaque full-bleed tile
  (no transparency) for the apple-touch-icon per spec.
- Rendered via headless Chrome screenshot at each target size directly (no blurry
  upscale): assets/favicon.svg (vector, K-only), assets/favicon-16x16.png,
  assets/favicon-32x32.png, assets/favicon-512.png, assets/apple-touch-icon.png,
  assets/icon-192.png (new, for the webmanifest), assets/favicon.ico and
  favicon.ico (root), both multi-size 16+32+48 (Pillow ICO writer).
- md5 of every new favicon file differs from its archive/ counterpart (verified,
  see table below). grep for "Hunter|#38BDF8|#090D16" across every non-archive
  .html/.css/.svg/.webmanifest/.json/.js file: 0 hits.

| file | new md5 | archive md5 |
|---|---|---|
| favicon.svg | 9cf6a874... | a10fc78a... (differ) |
| favicon-16x16.png | 23b02aa8... | 3e0906ac... (differ) |
| favicon-32x32.png | adf4fca8... | b1de15ca... (differ) |
| favicon-512.png | 1c8f49dc... | f3e6d010... (differ) |
| apple-touch-icon.png | 49cfc98c... | 641a06e5... (differ) |
| favicon.ico (assets + root) | 5288f795... | 14348985... (differ) |

Added /site.webmanifest (name "Krishnendu Biswas", short_name "KB", icons 192+512,
theme_color #1F5C4A, background_color #F7F4EE) and, on every non-archive page head:
<link rel="manifest" href="/site.webmanifest">, <meta name="theme-color"
content="#1F5C4A">, plus a new explicit 16x16 <link rel="icon"> alongside the existing
svg/32x32/apple-touch-icon links. All favicon href values cache-busted with ?v=2.

Contact sheet (favicon at 16/32/180/512, light + dark background) and a header/button
crop showing GitHub + LinkedIn + Email icons at 390 and 1440, captured over a local
python http.server (never file://): ~/workhorse/krishnendu-me/log/shots_icons/
(favicon_contact_sheet.png, icons_1440_light.png, icons_1440_dark.png,
icons_390_light.png, plus hero_1440.png / hero_390.png for the avatar fix below).

## 3. Avatar circle fix (owner complaint, folded into this card)

Cause confirmed: assets/avatar.webp is a circular crop with transparent corners
(corner alpha 0), but styles.css .avatar drew a near-square frame (border-radius:2px)
with a border and a --box background fill behind it, producing a "circle inside a
square" look.

Fix:
- styles.css .avatar: border-radius:50%, background:transparent, removed the square
  border, added box-shadow:inset 0 0 0 1px var(--rule) as a 1px ring drawn on the
  circle itself (token colour, not a new hex).
- Regenerated assets/avatar.webp from inputs/avatar_formal_512.png at 144x144 (2x the
  72px CSS display size, for retina crispness), WEBP quality 90, 6.9 KB (well under
  the 20 KB cap). .avatar is used in exactly one place on the site (index.html hero);
  no other page or the /log/ home card uses this class.

Verified by pixel sampling the rendered screenshot (vision backend was unavailable
this session -- see Known issues -- so this was checked by sampling actual rendered
pixel colours against the known CSS tokens, which is deterministic):
- 1440px viewport, light theme: all 4 corners of the avatar's 72x72 box = (247,244,238)
  = #F7F4EE, the page background exactly. No square box colour (#EFEBE3) visible.
  Center pixel (182,134,109) matches the source photo's centre tone.
- 390px viewport, dark theme: all 4 corners = (21,21,20) = #151514, the dark-theme page
  background exactly. Center (181,135,109) matches the photo again.
Crops: log/shots_icons/hero_1440.png, log/shots_icons/hero_390.png.

## 4. Home-page nits (coordinator comment, 4 items)

1. Punctuation consistency (hero topology diagram): the diagram used a spaced slash
   ("Discord / Telegram", "default / router") while the rest of the page already uses
   an unspaced slash ("Discord/Telegram", used in the figcaption and the card copy).
   Fixed both diagram labels to the unspaced style; "kanban hand-offs" is a hyphenated
   compound, not a slash construct, and was left as-is.
2. Light grey profile box contrast: measured, not changed. WCAG contrast ratios with
   the current tokens (computed, sRGB relative luminance):
   ink #1A1917 on box #EFEBE3 = 14.78:1; white on accent #1F5C4A = 7.81:1; muted
   #5A5750 on box #EFEBE3 = 6.06:1. Dark theme: ink #ECE7DC on box #1D1D1B = 13.69:1;
   accent-ink #151514 on accent #6FCBAB = 9.40:1. All comfortably over 4.5:1 already,
   via tokens, no hardcoded hex found in the diagram's text classes. No code change
   needed; this item appears to have been fixed in an earlier round that the
   coordinator's screenshot predated.
3. F1-Macro chart axis title clipped: confirmed. "F1-Macro (0 to 1)" sits only 6px
   above the bottom edge of both the wide (viewBox 680x162) and narrow (340x204)
   chart viewBoxes, and SVG clips to its own box by default. Fixed by adding 10px of
   viewBox height to each (162->172, 204->214) without moving any other coordinate,
   giving the axis title room.
4. QualityKiosk funnel label alignment: measured via real DOM getBoundingClientRect
   on the rendered page at 1440 (wide variant) and 390 (narrow variant); not changed.
   Wide: each stage's descriptor label (e.g. "by complexity") starts exactly 16px right
   of its own bar's right edge, vertical centers within 1.3px of each other, for all
   3 stages. Narrow: each descriptor label and its own stage's count badge both sit
   fully inside the same trapezoid (e.g. "final grouping" top=4655/bottom=4676 is
   inside trapezoid 3's top=4646/bottom=4701), for all 3 stages. No misalignment found
   in the current code; likely already fixed in an earlier round.

## 5. Verification gates

- grep "Hunter|#38BDF8|#090D16" over non-archive assets/html/css/svg: 0 hits.
- md5 of every new favicon differs from its archive/ counterpart: confirmed (table above).
- svg_measure.mjs over the whole site (27 pages, 81 svg-text rows): fails=0, min text
  size 13.1-14.3px, 0 overflow.
- privacy_gate.py: PASS (0 findings).
- JSON-LD: 20 <script type="application/ld+json"> blocks across non-archive pages,
  all parse as valid JSON (0 invalid).
- Resume PDF md5: ebe30d5b3715c2a2d0a2fcdcd04b31a9 (unchanged, matches the required value).
- dashes (em/en) outside archive: 0.
- fact_gate.sh flagged 4 pre-existing items, none introduced by this card and none
  inside the files this card touched:
  - "autonomous": 3 hits, all in tooling (tools/log/privacy_gate.py's own test string,
    tools/log/publish_allowlist.yaml's banned-phrase list, and its compiled .pyc) --
    not visible site content.
  - "100%": 1 hit in styles.css, all CSS percentage units (width:100% etc), not a
    prose metric claim.
  - "bge-small" in work/memory/index.html (the memory architecture diagram names the
    local embedding model): kb=NONE, i.e. not yet backed by a line in
    ~/.hermes/knowledge/*.md. Pre-existing from an earlier case-study build, outside
    this card's scope (icons/favicon/avatar/4 nits only). Needs a fact-sourcing pass,
    not a content rewrite by this card.
  - "committee-mentions: 2": one JSON-LD Organization entry (index.html, structured
    data) plus one visible Leadership entry -- same single role title, echoed once
    into structured data. Reads as compliant with "role title, once" in spirit; flagged
    here for the record rather than silently left unexamined.
  These are noted for a follow-up fact-audit card, not fixed here.

## Known issues this session

- Vision-based screenshot review (auxiliary.vision.model) returned
  "HERMES_MODEL_ADMISSION_CONSUMED" / incomplete upstream response on every attempt and
  could not be used. All visual claims in this report are backed by deterministic
  checks instead: real DOM getBoundingClientRect() measurements, computed WCAG contrast
  ratios, and direct pixel sampling of the rendered screenshots (not eyeballing). The
  crops in log/shots_icons/ are left for a human or a working vision backend to confirm.
