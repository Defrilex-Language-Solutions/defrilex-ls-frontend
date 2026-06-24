# Defrilex — Project Context (Defrilex Language Solutions)

> Context document for engineers/agents working on this repository.
> Last updated: 2026-06-23.

## 1. The two brands

Defrilex runs **two brands that share one application architecture** but hold
**distinct SEO positioning**:

| Brand | Marketing domain | App domain | Owns (SEO) |
|---|---|---|---|
| **Defrilex Language Solutions** (LS) | `defrilex-ls.com` | `app.defrilex-ls.com` | language services, interpretation, translation, localization, LSP, interpreter marketplace, remote/medical/legal interpreter, multilingual staffing |
| **DefrilexCX** (CX) | `defrilexcx.com` | `app.defrilexcx.com` | BPO, customer support outsourcing, CX outsourcing, multilingual customer support, contact center, back office, AI customer operations |

## 2. Architecture — "Split"

```
defrilex-ls.com   (static marketing)        defrilexcx.com   (static marketing)
   defrilex-ls-frontend  ◄── THIS REPO          defrilexcx-bpo
            │                                          │
            └──────────────►  app.defrilex-ls.com  ◄───┘  app.defrilexcx.com
                              one shared Laravel 11 + Inertia/React app
                              (repo: Defrilex-marketplace), themed per-host
                              by the BRAND env var (BRAND=ls | BRAND=cx)
```

- **Marketing sites are standalone static HTML** — no Laravel/Inertia/build step.
- **The application is a single shared Laravel/Inertia codebase** that themes itself
  for LS vs CX from the `BRAND` environment variable (see `config/brand.php` in
  `Defrilex-marketplace`, exposed to React via a shared `brand` Inertia prop and
  the `useBrand()` hook).

## 3. Repositories

| Repo | Role |
|---|---|
| **defrilex-ls-frontend** (this) | LS static marketing site → `defrilex-ls.com` |
| **defrilexcx-bpo** | CX static marketing site → `defrilexcx.com` (also contains a legacy bundled copy of the Laravel app; the app is deployed from the reference repo under Split) |
| **Defrilex-marketplace** | Shared application (Laravel 11, Inertia v2, React + TS, Tailwind v4, Vite). Serves both `app.*` via `BRAND`. |

## 4. This repository

Pure **static marketing + auth-entry** site. No backend, no build step — served by
any static host (`npm run dev` uses `npx serve`).

Pages: `index.html` (LS home), `for-lsps.html`, `for-bpos.html`, `marketplace.html`,
`talent.html`, `why-defrilex.html`, `contact.html`, plus auth-entry pages
(`login`, `register`, `forgot-password`, `reset-password`, `code-verify`) which are
`noindex` and whose nav CTAs point to `https://app.defrilex-ls.com`.

Assets: `assets/` (CSS/JS/img/video), `assets/img/og-image.png` (1200×630 OG card),
favicons under `assets/favicon/`, `site.webmanifest`, `robots.txt`, `sitemap.xml`.

## 5. Brand tokens (LS)

- Name: **Defrilex Language Solutions** (short: *Defrilex LS*)
- Navy `#0b2b8d` · Accent orange `#f89100`
- Support: `contact@defrilex-ls.com`
- Wordmark: `/defrilex-wordmark.svg`

## 6. SEO & brand separation

- **Keyword separation** is deliberate (see table in §1) to prevent cross-domain
  cannibalization. LS leads with language/interpretation/translation; the
  `/for-bpos` page intentionally **defers CX intent** to `defrilexcx.com` via an
  in-content link (and CX's `/for-lsps` defers language intent back to LS).
- Every public page has: unique `<title>`, meta description, self-referential
  absolute `canonical`, full Open Graph + Twitter tags, and JSON-LD
  (`WebPage` + `WebSite`/`BreadcrumbList`; `Organization` + `Service` on home).
- `robots.txt` → `Sitemap: https://defrilex-ls.com/sitemap.xml`. Sitemap contains
  **LS URLs only**. Auth pages are `noindex`.

## 7. Deployment

- **Marketing (this repo):** publish repo root to a static host/CDN. Enable
  clean URLs (`/for-lsps` → `for-lsps.html`), HTTPS/HSTS, and a 404 fallback.
- **App (`app.defrilex-ls.com`):** deploy `Defrilex-marketplace` with
  `BRAND=ls`, `APP_URL=https://app.defrilex-ls.com`, `APP_ENV=production`,
  `APP_DEBUG=false`, a generated `APP_KEY`, then
  `composer install && npm install && npm run build` + `php artisan migrate --force`
  + config/route/view cache.

## 8. Architecture decision (2026-06-23)

Reviewed converting the frontends to standalone SPAs (Next.js) backed by a shared
`api.defrilex.com`. **Decision: keep Laravel/Inertia for the app; keep marketing
standalone static.** Rationale: no REST API exists yet (the backend is Inertia-first;
there is no `routes/api.php`), so standalone conversion is a large, backend-heavy,
high-risk project. The marketing sites are already standalone. Revisit only if a
non-Laravel/mobile client must consume the same API or Laravel is being retired —
in which case build `api.defrilex.com` first and run Inertia in parallel.
