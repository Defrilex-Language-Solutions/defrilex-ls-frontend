# Defrilex — Project Context (Defrilex Language Solutions)

> Context document for engineers/agents working on this repository.
> Last updated: 2026-06-23.

## 1. Mission & framing

**The Marketplace is the operational platform.** It already exists and already
provides authentication, user management, marketplace workflows, dashboard
functionality, business logic, and backend integrations. It remains the source of
functionality, workflows, and business logic, and it is **not** being replaced,
re-architected, or retired.

**Defrilex LS and DefrilexCX provide specialized branded experiences, marketing
properties, and frontend adaptations that connect users into the Marketplace
ecosystem.** The work in these repositories is frontend modernization, UX, branding,
onboarding, login/signup experience, marketing, SEO, visual design, and brand
differentiation — **built around the Marketplace foundation, not a replacement for it.**

Evaluate future work through this lens: *"How can we improve the frontend experience
while preserving Marketplace functionality?"* This is **not** an API-first migration,
a Laravel replacement, or a pair of independent platforms.

## 2. The two branded experiences

| Brand | Marketing property | Marketplace experience | SEO focus |
|---|---|---|---|
| **Defrilex Language Solutions** (LS) | `defrilex-ls.com` | `app.defrilex-ls.com` | language services, interpretation, translation, localization, LSP, interpreter marketplace, remote/medical/legal interpreter, multilingual staffing |
| **DefrilexCX** (CX) | `defrilexcx.com` | `app.defrilexcx.com` | BPO, customer support outsourcing, CX outsourcing, multilingual customer support, contact center, back office, AI customer operations |

## 3. How the pieces fit

```
defrilex-ls.com  (LS marketing property)     defrilexcx.com  (CX marketing property)
   defrilex-ls-frontend  ◄── THIS REPO          defrilexcx-bpo-frontend
            │                                          │
            └──────────────►   the Marketplace platform (Laravel 11 + Inertia/React)
                               presented as branded experiences at
                               app.defrilex-ls.com and app.defrilexcx.com,
                               adapted per brand via the BRAND env var (ls | cx).
```

- **Marketing properties are static HTML** — no backend, no build step.
- **The Marketplace platform** (repo: `Defrilex-marketplace`) is the operational
  product. Its frontend is adapted per brand from the `BRAND` environment variable
  (`config/brand.php` → shared `brand` Inertia prop → `useBrand()` hook). Same
  platform, same functionality — branded presentation.

## 4. Repositories

| Repo | Role |
|---|---|
| **defrilex-ls-frontend** (this) | LS marketing property → `defrilex-ls.com` |
| **defrilexcx-bpo-frontend** | CX marketing property → `defrilexcx.com` |
| **Defrilex-marketplace** | The Marketplace platform (operational product). Presents branded experiences at both `app.*` via `BRAND`. |

## 5. This repository

Static **marketing + brand-entry** property for Defrilex LS. No backend, no build
step — served by any static host (`npm run dev` uses `npx serve`).

Pages: `index.html` (LS home), `for-lsps.html`, `for-bpos.html`, `marketplace.html`,
`talent.html`, `why-defrilex.html`, `contact.html`, plus brand-entry auth pages
(`login`, `register`, `forgot-password`, `reset-password`, `code-verify`) which are
`noindex` and whose CTAs route users into the Marketplace experience at
`https://app.defrilex-ls.com`.

Assets: `assets/` (CSS/JS/img/video), `assets/img/og-image.png` (1200×630 OG card),
favicons under `assets/favicon/`, `site.webmanifest`, `robots.txt`, `sitemap.xml`.

## 6. Brand tokens (LS)

- Name: **Defrilex Language Solutions** (short: *Defrilex LS*)
- Navy `#0b2b8d` · Accent orange `#f89100`
- Support: `contact@defrilex-ls.com`
- Wordmark: `/defrilex-wordmark.svg`

## 7. SEO & brand differentiation

- **Keyword separation** is deliberate (see §2) so the two branded properties don't
  cannibalize each other. LS leads with language/interpretation/translation; the
  `/for-bpos` page intentionally **routes CX intent** to `defrilexcx.com` via an
  in-content link (and CX's `/for-lsps` routes language intent back to LS).
- Every public page has: unique `<title>`, meta description, self-referential
  absolute `canonical`, full Open Graph + Twitter tags, and JSON-LD
  (`WebPage` + `WebSite`/`BreadcrumbList`; `Organization` + `Service` on home).
- `robots.txt` → `Sitemap: https://defrilex-ls.com/sitemap.xml`. Sitemap contains
  **LS URLs only**. Auth/brand-entry pages are `noindex`.

## 8. Deployment

- **Marketing property (this repo):** publish repo root to a static host/CDN. Enable
  clean URLs (`/for-lsps` → `for-lsps.html`), HTTPS/HSTS, and a 404 fallback.
- **Marketplace experience (`app.defrilex-ls.com`):** deploy the
  `Defrilex-marketplace` platform with `BRAND=ls`,
  `APP_URL=https://app.defrilex-ls.com`, `APP_ENV=production`, `APP_DEBUG=false`,
  a generated `APP_KEY`, then `composer install && npm install && npm run build` +
  `php artisan migrate --force` + config/route/view cache.

## 9. Scope guardrails

In scope: frontend modernization, UX, branding, onboarding, login/signup experience,
marketing, SEO, visual design, brand differentiation — all preserving Marketplace
functionality. **Out of scope:** redesigning the backend architecture, API-first
migration, replacing Laravel, or building independent applications. The Marketplace
remains the foundation; these repositories adapt the experience around it.
