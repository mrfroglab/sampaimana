# Arsitektur

Gambaran besar cara Sampai Mana bekerja. Rincian tiap bagian ada di dokumen pemiliknya (lihat [peta dokumentasi](README.md)).

## Komponen

```
Pengunjung ──HTTPS──▶ Cloudflare (DNS, TLS, tunnel, analytics beacon)
                          │
                          ▼
                  Caddy (caddy-proxy, jaringan gateway-net)
                   ├── /api/*  ──▶ sampaimana-api :5000  (Express 5 + Prisma)
                   │                     │        └── /data/uploads (bukti kontribusi, privat)
                   │                     ▼
                   │               sampaimana-db :5432 (PostgreSQL 16)
                   └── lainnya ──▶ sampaimana-web :3000 (React Router 7 SSR)
                                          └── memanggil API lewat http://sampaimana-api:5000
```

| Komponen | Repo | Image | Catatan |
| --- | --- | --- | --- |
| Web (SSR) | `mrfroglab/sampaimana` | `ghcr.io/mrfroglab/sampaimana` | Merender halaman publik di server. Halaman akun dan redaksi dimuat di klien. |
| API | `mrfroglab/api-sampaimana` | `ghcr.io/mrfroglab/api-sampaimana` | REST di bawah `/api`, OpenAPI di `/api/docs`. Menjalankan migrasi dan seed saat start. |
| Database | — | `postgres:16-alpine` | Data di `./data/postgres` pada stack. |
| Reverse proxy | — | Caddy | Blok situs dikelola `deploy/deploy.sh`. IP asli diambil dari `CF-Connecting-IP`. |

Semuanya berjalan di satu mesin, stack Docker `/opt/stacks/apps/sampaimana`. Definisinya ada di
[`deploy/docker-compose.yml`](../deploy/docker-compose.yml).

## Satu domain, tanpa CORS

Web dan API dilayani dari domain yang sama (`sampaimana.hallojanu.me`). Caddy meneruskan `/api/*` ke API dan sisanya ke web.
Akibatnya:

- Cookie refresh dari API bisa berupa `SameSite=Strict; Path=/api/auth` dan tetap terkirim dari halaman web.
- Browser tidak pernah butuh CORS. `CORS_ORIGIN` di API diisi URL situs hanya sebagai pengaman.
- Server SSR web memanggil API lewat jaringan internal (`API_INTERNAL_URL`), bukan lewat internet.

## Alur autentikasi

1. Masuk: `POST /api/auth/login` (lalu `POST /api/auth/login/2fa` bila 2FA aktif) mengembalikan **access token JWT** (15 menit)
   di body, dan **refresh token opaque** di cookie `httpOnly`.
2. Klien menyimpan access token **hanya di memori** (`app/lib/session.ts`). Tidak ada token di `localStorage`.
3. Saat halaman dibuka, atau saat API membalas 401, klien memanggil `POST /api/auth/refresh`. Refresh token dirotasi setiap kali
   dipakai. Bila token lama dipakai ulang, seluruh keluarga sesinya dicabut.
4. DB hanya menyimpan hash SHA-256 refresh token, plus user agent supaya pengguna bisa melihat dan mencabut sesi.

Pengaman lain (lockout, TOTP, cek sandi bocor, Turnstile) dijelaskan di README API, bagian Keamanan.

## Peran

| Peran | Bisa |
| --- | --- |
| `CONTRIBUTOR` | Mengikuti kasus, menerima notifikasi, mengirim kontribusi. Peran default untuk akun baru. |
| `VIEWER` | Melihat meja redaksi, termasuk log audit, tanpa mengubah apa pun. |
| `EDITOR` | Mengelola kasus, tahapan, artikel, sumber, kategori, moderasi, koreksi, dan impor SIPP. |
| `SUPER_ADMIN` | Semua hal di atas, ditambah pengguna: peran, blokir, buka kunci, reset 2FA. |

Penjaganya ada di `src/middlewares/auth.js` (`STAFF`, `EDITORS`) dan di awal setiap rute `src/modules/admin.js` repo API.

## Data

Model utama: `Case` → `CaseStage` (tahapan, tenggat `dueAt`) → `Article` dan `Source`. Setiap perubahan pada kasus dicatat di
`CaseRevision` (publik). Tindakan admin dicatat di `ActivityLog` (internal). Masukan publik masuk lewat `CaseContribution`
(perlu akun) dan `CorrectionRequest` (tanpa akun). Skema lengkap ada di `prisma/schema.prisma` repo API.

Kasus tidak pernah benar-benar dihapus dari tampilan admin: `DELETE /api/admin/cases/:id` mengarsipkannya dan bisa dipulihkan.

## Pekerjaan terjadwal

Ringkasan redaksi harian berjalan **di dalam proses API** (`src/jobs/scheduler.js`), bukan cron terpisah. Kunci advisory
Postgres dan tabel `job_runs` menjamin pengiriman hanya sekali per hari meski API berjalan di banyak instance.

Backup berjalan di host lewat systemd user timer. Lihat [deploy/OPS.md](../deploy/OPS.md).

## Header keamanan web

`app/entry.server.tsx` memasang CSP di setiap respons. Semua halaman dilindungi dari framing (`frame-ancestors 'self'`), kecuali
widget publik `/embed/*` yang memang boleh dipasang di situs mana pun. `script-src` mengizinkan beacon analytics Cloudflare
karena Cloudflare menyisipkannya di edge.

## Deploy

Push ke `main` di salah satu repo menjalankan: test → build image → push ke GHCR → runner self-hosted di server menarik image
dan me-restart **hanya** service itu, lalu mengecek health. Migrasi database berjalan otomatis saat container API start.

Perubahan pada `deploy/docker-compose.yml` atau blok Caddy **tidak** ikut CI. Keduanya diterapkan dengan menjalankan
`deploy/deploy.sh` di server (lihat README).
