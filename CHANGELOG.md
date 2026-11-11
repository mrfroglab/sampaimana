# Changelog

<!-- Dibuat otomatis oleh scripts/changelog.mjs dari commit feat/fix/perf/security. Jangan diedit manual: jalankan `pnpm changelog`. -->

Perubahan yang terasa bagi pengguna, dikelompokkan per tanggal (WIB). Detail teknis ada di riwayat commit.

## 2026-11-11

### Fitur

- **legal:** privacy policy and terms pages rendered from docs/legal

## 2026-11-10

### Keamanan

- allow Cloudflare's analytics beacon in script-src
- production CSP hardening (object-src, base-uri, form-action, script-src allow-list); ops: optional backup heartbeat

### Fitur

- **auth:** two-factor sign-in, session list, account security and admin unlock/reset
- **design:** Awesomic-style zinc redesign
- **trends:** /tren page with slowest institutions and duration per category from verified stages, with sample counts and methodology
- **embed:** embeddable case widget (iframe + embed.js), /tanam generator, site-wide frame protection and self-hosted fonts
- **seo:** per-case share images, people and institution pages, JSON-LD, sitemap and regenerated brand assets
- **admin:** needs-check panel on the overview and attention badge/filter in the case list
- **admin:** paste-based SIPP import dialog with reviewable stage proposals
- **ui:** monochrome design system redesign (Geist, pill controls, hairline cards)
- rebuild web as SSR editorial tracker with newsroom desk

## 2026-07-03

### Fitur

- enhance Home.jsx skeleton with multi-element structure matching actual content

### Perbaikan

- align skeleton CSS selectors with JSX structure for precise loading match

## 2026-06-30

### Fitur

- install recharts and implement interactive DonutChart using PieChart component
- make donut chart and categories list interactive conforming to DESIGN.md
- restructure homepage section order: Cases Table -> Categories -> Stats
- move download pdf button to right side next to back navigation on desktop in CaseDetail
- rename Dashboard in navbar to Home and commit PDF print floating button modifications
- change 'Lihat Timeline' to 'Lihat Detail' and improve news links labeling in CaseDetail
- align cases table design and make navbar and home page responsive on mobile
- restructure Kelola Perkara layout with Cases table first and Modals for adding cases/stages
- implement full CRUD for Cases and Stages in Admin panel
