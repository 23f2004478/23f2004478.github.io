# Client Interactivity Layer Documentation (krishnendu.me v5)

This document describes the client-side interactivity, navigation, and motion architecture implemented across krishnendu.me. All interactive features are modular, framework-free vanilla JavaScript and standard CSS, fully controlled via `site.config.json` and CSS custom properties in `:root`.

---

## 1. Central Switchboard (`site.config.json`)

The entire client interaction layer is governed by `site.config.json` at the repository root. Every interactive feature has an associated boolean flag under `features`. Setting any flag to `false` and rebuilding disables the feature without side effects or broken dependencies.

```json
{
  "motion": "full",
  "features": {
    "view_transitions": true,
    "prefetch": true,
    "search": true,
    "reveal": true,
    "countup": true,
    "toc": true,
    "back_to_top": true,
    "chart_tooltips": true,
    "diagram_focus": true,
    "copy_email": true,
    "filters": true,
    "theme_fade": true
  }
}
```

---

## 2. Interaction Modules

### Search & Command Palette (`search`)
- **What**: Client-side command palette providing instant fuzzy search across all 22 static site pages, headings, and case studies. Includes keyboard navigation (Arrow keys, Enter, Escape), focus trapping, and backdrop dismiss.
- **Hook**: `[data-ix~="search"]`, `.search-trigger`, `.search-modal`, keyboard shortcuts (`/` and `Cmd+K` / `Ctrl+K`).
- **Flag**: `features.search`.
- **How to Disable/Restyle**: Set `features.search: false` in `site.config.json`. Styles live in `assets/css/ix/search.css` and use `--paper`, `--ink`, `--rule`, and `--accent`.

### View Transitions (`view_transitions`)
- **What**: Cross-document page transitions using the native CSS `@view-transition` specification, delivering smooth morphing navigation between case study overview rows and destination detail pages.
- **Hook**: `@view-transition { navigation: auto; }` and `view-transition-name` assignments.
- **Flag**: `features.view_transitions`.
- **How to Disable/Restyle**: Set `features.view_transitions: false` in `site.config.json`. CSS rules reside in `assets/css/ix/motion.css`.

### Speculation Rules Prefetch (`prefetch`)
- **What**: Prerenders and prefetches same-origin document links on hover and pointerdown for instant page loads, excluding PDFs, archives, and feeds.
- **Hook**: `<script type="speculationrules">` in page `<head>`.
- **Flag**: `features.prefetch`.
- **How to Disable/Restyle**: Set `features.prefetch: false` in `site.config.json`. Managed in `scripts/build_v4_site.py`.

### Scroll Reveal (`reveal`)
- **What**: Subtle IntersectionObserver-driven scroll reveals that fade and lift content sections (`translateY(var(--reveal-y))`) into view once on viewport entry. First viewport and hero content are exempt to preserve immediate LCP.
- **Hook**: `[data-ix~="reveal"]`, `.reveal-on-scroll`.
- **Flag**: `features.reveal`.
- **How to Disable/Restyle**: Set `features.reveal: false` in `site.config.json` or switch `motion: "off"`. Distances are tuned via `--reveal-y` in `assets/css/ix/tokens.css`.

### Proof Strip Count-up (`countup`)
- **What**: Smooth numeric count-up animation on first viewport entrance for key statistics while preserving tabular numerals and decimals (e.g. `74.19%`). Full semantic numbers and ARIA labels remain accessible when JavaScript is disabled.
- **Hook**: `[data-ix~="countup"]`, `.proof .stat-num`.
- **Flag**: `features.countup`.
- **How to Disable/Restyle**: Set `features.countup: false` in `site.config.json`. Timing and ease are controlled via `--dur-slow` and `--ease-out`.

### Table of Contents & Scrollspy (`toc`)
- **What**: Sticky reading sidebar navigation for long-form case studies and articles on viewports >=1100px with live scrollspy highlight, plus collapsible on-page table of contents on mobile and tablet viewports.
- **Hook**: `[data-ix~="toc"]`, `.page-toc`, `.toc-sticky`, `.has-toc`.
- **Flag**: `features.toc`.
- **How to Disable/Restyle**: Set `features.toc: false` in `site.config.json`. Styles live in `assets/css/ix/reading.css`.

### Back to Top Button (`back_to_top`)
- **What**: Accessible floating action button appearing after 1.5 viewports of vertical scroll to smoothly return the reader to the page top without obstructing mobile content.
- **Hook**: `[data-ix~="back_to_top"]`, `.back-to-top`.
- **Flag**: `features.back_to_top`.
- **How to Disable/Restyle**: Set `features.back_to_top: false` in `site.config.json`. Minimum touch target is 44px.

### Data Chart Tooltips (`chart_tooltips`)
- **What**: Hover, focus, and tap tooltips on SVG chart bars, points, and metrics showing exact values, labels, and units with full keyboard focusability (`tabindex="0"`).
- **Hook**: `[data-ix~="chart_tooltips"]`, `svg.chart-svg [tabindex="0"]`, `.chart-tooltip`.
- **Flag**: `features.chart_tooltips`.
- **How to Disable/Restyle**: Set `features.chart_tooltips: false` in `site.config.json`. Styled via `assets/css/ix/diagrams.css`.

### Diagram Focus & Lightbox (`diagram_focus`)
- **What**: Interactive diagram nodes that dim unrelated nodes on hover/focus and display accessible captions via `aria-live`, plus full-screen SVG diagram lightbox modal for detailed architectural exploration.
- **Hook**: `[data-ix~="diagram_focus"]`, `figure.fig`, `svg.dg`, `.diag-expand-btn`, `.diag-modal-backdrop`.
- **Flag**: `features.diagram_focus`.
- **How to Disable/Restyle**: Set `features.diagram_focus: false` in `site.config.json`. Styles in `assets/css/ix/diagrams.css`.

### Copy Email & Section Links (`copy_email`)
- **What**: One-click copy buttons for email addresses, code blocks, and section heading anchors, accompanied by an accessible live toast notification (`role="status"`).
- **Hook**: `[data-ix~="copy_email"]`, `.heading-anchor`, `.copy-btn`, `.toast-notice`.
- **Flag**: `features.copy_email`.
- **How to Disable/Restyle**: Set `features.copy_email: false` in `site.config.json`. Toast styling resides in `assets/css/ix/reading.css`.

### Interactive Tag Filters (`filters`)
- **What**: Category filtering chips on credentials and project hubs (All, Agentic AI, Machine Learning, Data and BI, Business) synchronized with URL hash state for deep linking.
- **Hook**: `[data-ix~="filters"]`, `.filter-chips`, `.filter-btn`, `.filter-item`.
- **Flag**: `features.filters`.
- **How to Disable/Restyle**: Set `features.filters: false` in `site.config.json`. Filter styles in `assets/css/ix/controls.css`.

### Theme Transition Fade (`theme_fade`)
- **What**: Circular and cross-fade view transition on light/dark mode toggling, falling back to instant theme switching without layout flashes or blocking scripts.
- **Hook**: `[data-ix~="theme_fade"]`, `.theme-btn`, `document.startViewTransition`.
- **Flag**: `features.theme_fade`.
- **How to Disable/Restyle**: Set `features.theme_fade: false` in `site.config.json`. Styled in `assets/css/ix/motion.css`.

---

## 3. Motion & Reduced Motion Tokens

All transitions use standard `:root` tokens:
- `--dur-1`: 120ms (fast UI feedback)
- `--dur-2`: 200ms (standard transitions)
- `--dur-3`: 320ms (modal, drawer, and layout transitions)
- `--ease-out`: `cubic-bezier(0.2, 0.7, 0.2, 1)`
- `--ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)`
- `--reveal-y`: 12px
- `--lift`: 2px

Under `@media (prefers-reduced-motion: reduce)` or `motion: "off"`, durations collapse to 0ms and transforms are eliminated.
