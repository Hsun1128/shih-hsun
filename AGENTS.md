# AGENTS.md

This repository is a pure static HTML/CSS/JS portfolio website. There is **no build step, no bundler, and no package manager**. For full repository, architecture, and convention details, see `CLAUDE.md` and `README.md`.

## Cursor Cloud specific instructions

### Services

| Service | Required | How to run | Notes |
|---|---|---|---|
| Static HTTP server | Yes | `python3 -m http.server 8080` (from repo root), then open `http://localhost:8080/index.html` | `python3` is preinstalled. Any static server works (`npx serve .` also fine). |
| Supabase backend | No (external, hosted) | Nothing to run locally | Analytics/tracking only. Public URL + anon key are hardcoded in `js/supabase-client.js`. The dashboard reads live data via RPCs. |

### Non-obvious caveats

- **Must serve over HTTP — `file://` does not work.** Pages load header/footer HTML partials via `fetch()` (`js/components.js`); `fetch()` fails on the `file://` protocol, so the nav/footer (and the footer visit counter) will silently not render unless served over HTTP.
- **No install/build/lint/test tooling exists.** There is no `package.json`, lockfile, linter, or test suite in this repo. "Building" the app just means serving the static files. Do not introduce a package manager or build step unless explicitly requested.
- **CDN/internet access needed for full functionality.** Supabase JS, FingerprintJS, Chart.js, and Google Fonts load from CDNs. Core portfolio content still renders offline, but the dashboard charts, visitor tracking, and web fonts require outbound internet.
- **Cache-busting:** after editing any CSS/JS, bump the `?v=YYYYMMDD` query string on the corresponding `<link>`/`<script>` tags (see `CLAUDE.md`).
- **Pages:** `index.html` (portfolio), `certs.html` (certificate gallery), `dashboard.html` (live analytics, omits `tracking.js`), `404.html`.
