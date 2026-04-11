# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for **Shih Hsun (Michael) Wang**, an AI & Manufacturing Engineer. The site showcases projects, skills, experience, and certifications, and includes a live analytics dashboard. Deployed as a static site on GitHub Pages at `https://hsun1128.github.io/shih-hsun/`.

- **No build step.** Pure static HTML/CSS/JS — no bundler, no framework, no package manager.
- **Backend:** Supabase (analytics/tracking only — not content-driven).
- **Deployment:** GitHub Pages; pushing to the remote triggers deployment automatically.

---

## Repository Structure

```
/
├── index.html              # Main portfolio page
├── certs.html              # Certificate gallery page
├── dashboard.html          # Analytics dashboard page
├── 404.html                # Custom error page
├── robots.txt / sitemap.xml
│
├── components/             # Reusable HTML partials (loaded dynamically)
│   ├── header-main.html    # Nav header for index.html
│   ├── header-certs.html   # Nav header for certs.html
│   ├── header-dashboard.html # Nav header for dashboard.html
│   └── footer.html         # Shared footer (contains visit counter)
│
├── css/
│   ├── style.css           # Aggregator: @imports all other CSS files (used by index.html)
│   ├── base.css            # CSS variables, resets, reveal animation
│   ├── layout.css          # Navigation, section containers
│   ├── components.css      # Buttons, lightbox
│   ├── sections.css        # Hero, about, skills, experience, contact
│   ├── certs_style.css     # Certificate gallery page styling (also base sheet for dashboard.html)
│   └── dashboard.css       # Analytics dashboard styles
│
├── js/
│   ├── supabase-client.js  # Supabase client initialization (window._supabase)
│   ├── components.js       # Dynamic component loading (header/footer); fires componentLoaded event
│   ├── tracking.js         # Visitor analytics (fingerprint, clicks, scroll, stay time)
│   ├── script.js           # Scroll reveal, mobile nav, lightbox (index.html)
│   ├── certs_script.js     # Certificate filtering and lightbox (certs.html)
│   └── dashboard.js        # Analytics dashboard data fetching and Chart.js rendering
│
└── assets/
    ├── CV_sm_en_*.pdf / CV_sm_zh_*.pdf
    ├── profile.png / profile.jpeg / background.png
    └── imgs/certs/         # Certificate images (.jpg) and PDFs
```

---

## Development Workflow

### Running Locally

There is no install step. Serve files with any static HTTP server (required — `fetch()` does not work over `file://`):

```bash
python3 -m http.server 8080
# or
npx serve .
```

### Deployment

Push to `main`. GitHub Pages auto-deploys from there. No CI pipeline or build step involved.

### Branch Strategy

- Production branch: `main`
- Feature branches: `feat/description`, `fix/description`, `refactor/description`
- Claude working branch convention: `claude/<task-slug>`

### Asset Versioning

CSS and JS tags use `?v=YYYYMMDD` query strings to bust browser caches. Update the date string when changing any CSS or JS file:

```html
<link rel="stylesheet" href="css/dashboard.css?v=20260409">
<script src="js/dashboard.js?v=20260409"></script>
```

---

## Component System

`js/components.js` implements a fetch-based HTML include system. Each page declares placeholder elements:

```html
<div id="header-placeholder" data-file="components/header-main.html"></div>
<!-- page content -->
<footer id="footer-placeholder"></footer>
```

`loadComponent()` reads `data-file` for the header (page-specific) and hardcodes the footer path. After injecting HTML via `innerHTML`, it dispatches a `componentLoaded` CustomEvent on the element. Consumers listen on this event:
- `components.js` calls `trackVisitor()` after the footer loads (footer contains `#visit-count`)
- `dashboard.js` listens on `#footer-placeholder` to populate visitor counts after footer injection

---

## Tracking Pipeline

Script load order matters — dependency chain:

1. `supabase-client.js` — creates `window._supabase` from a public anon key
2. `tracking.js` — defines `trackVisitor()`, uses FingerprintJS (CDN) to fingerprint visitors
3. `components.js` — calls `trackVisitor()` after footer loads

`trackVisitor()` calls Supabase RPC `get_or_create_visitor(p_fingerprint)` to get a stable UUID, then writes to `site_logs`. Behavior events are written to `behavior_logs`:

| Event type | Trigger |
|---|---|
| `click` | Element with `data-track-id` was clicked |
| `stay_time` | Seconds spent in a page section |
| `scroll_depth` | Max scroll % when leaving page |
| `page_stay_time` | Total time on page |
| `lightbox_view` | Lightbox item opened |

`sendBeacon()` uses `fetch(..., { keepalive: true })` instead of `navigator.sendBeacon` — the native API cannot send custom headers required by the Supabase REST API.

### Click Tracking Convention

Add `data-track-id` to any meaningful interactive element:

```html
<a href="#contact" data-track-id="cta_get_in_touch">Get in Touch</a>
```

`tracking.js` uses a single delegated `document` click listener via `closest('[data-track-id]')`. `dashboard.js` `formatTrackId()` maps raw IDs to display labels.

---

## Analytics Dashboard (`dashboard.html`)

`dashboard.js` fires 7 Supabase RPCs in parallel via `Promise.all()` on `DOMContentLoaded`:

| RPC | Data |
|---|---|
| `get_dashboard_overview` | KPI card values |
| `get_daily_visits(days)` | Visitor trend (7/14/30d) |
| `get_device_breakdown` | Device type + avg scroll/stay cross-metric |
| `get_section_engagement` | Avg seconds per section |
| `get_cta_clicks` | Click counts per `data-track-id` |
| `get_referrer_sources` | Traffic source breakdown |
| `get_scroll_depth_distribution` | Scroll depth buckets |

Charts use Chart.js 4 (CDN). The visitor trend chart is stateful (`visitorChart`, `allDailyData`, `currentView`, `currentDays`) — toggling daily/cumulative re-renders from cached data without re-fetching. Range changes (7/14/30d) do re-fetch.

`dashboard.html` does not load `tracking.js` — footer visitor counts are populated directly from the `get_dashboard_overview` RPC response.

---

## CSS Conventions

### File Responsibilities

| File | Purpose |
|---|---|
| `base.css` | CSS variables, box-sizing reset, `.reveal` animation |
| `layout.css` | Navigation bar, `.section-inner` container |
| `components.css` | `.btn` variants, lightbox overlay |
| `sections.css` | All section-specific styles (hero, about, skills, etc.) |
| `certs_style.css` | Certificate gallery page; also base sheet for `dashboard.html` |
| `dashboard.css` | Dashboard-only styles |

Place new styles in the most specific file. Do not add page-specific styles to `base.css` or `layout.css`.

### CSS Variables (Dark Theme Only)

Always use these — never hardcode colors:

```css
--bg-primary: #000000
--bg-secondary: #111111
--bg-card: #1d1d1f
--text-primary: #f5f5f7
--text-secondary: #a1a1a6
--text-muted: #6e6e73
--accent: #2997ff        /* blue — primary CTA */
--accent-green: #30d158
--accent-purple: #bf5af2
--accent-orange: #ff9f0a
--border: rgba(255,255,255,0.08)
```

### Scroll Reveal

Add `.reveal` to any block that should animate in on scroll. `script.js` uses `IntersectionObserver` to add `.visible` when the element enters the viewport. Do not replicate the observer — use the class.

---

## JavaScript Conventions

All JS is vanilla ES6 with no bundler. No `import`/`export` — files are loaded via `<script>` tags in dependency order at the bottom of `<body>`.

Global window variables for cross-module communication:
- `window._supabase` — Supabase client
- `window.visitorId` — resolved visitor UUID
- `window.__trackingPageLoadTime` — set at script load time before async work begins

---

## HTML Conventions

### Page Structure

```html
<div id="header-placeholder" data-file="components/header-X.html"></div>

<section id="section-name">
  <div class="section-inner"><!-- content --></div>
</section>

<footer id="footer-placeholder"></footer>

<script src="js/supabase-client.js"></script>
<script src="js/tracking.js"></script>   <!-- omit on dashboard.html -->
<script src="js/components.js"></script>
<script src="js/script.js"></script>
```

Use semantic elements (`<section>`, `<nav>`, `<header>`, `<footer>`, `<main>`). Section `id` values must match nav anchor `href`s.

---

## Key Patterns & Gotchas

1. **No `file://` protocol.** Component loading uses `fetch()` — always serve through a local HTTP server.
2. **Footer loads last.** `#visit-count` and `#visit-count-today` don't exist until the footer `componentLoaded` event fires. Never read these elements before that event.
3. **Cache-busting required.** Update `?v=YYYYMMDD` on `<link>`/`<script>` tags after modifying CSS or JS.
4. **Dark theme only.** No light mode. All colors via CSS variables — no hardcoded values.
5. **`reveal` class for animations.** New content blocks intended to animate in on scroll need `.reveal` — don't add new `IntersectionObserver` instances.
6. **`data-track-id` on new CTAs.** Any meaningful new button or link should have a `data-track-id` attribute.
7. **Page-specific headers.** Each page has its own header component file — do not share them.

---

## Supabase

The public anon key and project URL in `supabase-client.js` are intentionally hardcoded — these are browser-safe publishable keys with Row Level Security enforced on the database.

**Tables:**
- `site_logs` — one row per visitor per day (`visitor_id`, `visit_date`, `referrer`, `user_agent`, `screen_size`)
- `behavior_logs` — event stream (`visitor_id`, `event_type`, `page_section`, `details` jsonb)

**RPCs:** `get_or_create_visitor`, `get_site_stats`, `get_dashboard_overview`, `get_daily_visits`, `get_device_breakdown`, `get_section_engagement`, `get_cta_clicks`, `get_referrer_sources`, `get_scroll_depth_distribution`

---

## Git Commit Conventions

```
feat/short-description
fix/short-description
refactor/short-description
```
