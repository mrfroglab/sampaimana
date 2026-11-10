# Sampai Mana — Web

Situs publik dan meja redaksi untuk **Sampai Mana**, pelacak perkembangan kasus hukum publik di Indonesia.

React 19 · React Router 7 (framework mode, SSR) · TypeScript · Tailwind CSS 4 · Vite 7

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Masthead + posisi kasus per tahap, kasus baru bergerak, kasus paling lama tertahan, catatan redaksi |
| `/kasus` | Pencarian & filter (tahap, kategori, urutan) berbasis URL, paginasi |
| `/kasus/:slug` | Rel status, linimasa, sumber terverifikasi, pihak terkait, riwayat perubahan, ikuti, bagikan, ajukan koreksi |
| `/kasus/:slug/tahap/:id` | Artikel penjelasan per tahap |
| `/statistik` | Durasi rata-rata & median per tahap, sebaran tahap & kategori |
| `/data` | Unduhan CSV/JSON dan dokumentasi API publik |
| `/tentang` | Metodologi, verifikasi, kebijakan koreksi & hak jawab, penafian |
| `/akun/*` | Kasus diikuti, notifikasi, kontribusi, pengaturan |
| `/kontribusi/baru` | Formulir kontribusi dengan bukti tautan/file |
| `/redaksi/*` | Meja redaksi: ringkasan & SLA, kasus, linimasa, artikel, sumber, moderasi, koreksi, kategori, pengguna, log audit |

Halaman publik dirender di server (SEO, Open Graph per kasus, `sitemap.xml`, `robots.txt`). Halaman akun & redaksi
dimuat di klien setelah sesi dipulihkan.

## Autentikasi

Access token hanya disimpan di memori. Saat halaman dibuka, klien meminta token baru lewat `POST /api/auth/refresh`
menggunakan cookie `httpOnly` dari API (satu domain, jadi tanpa CORS). Tidak ada token di `localStorage`.

## Desain

Sistem monokrom ala shadcn: kanvas abu lembut, kartu putih berradius 24px dengan garis hairline, tombol/input/badge
berbentuk pil, tipografi Geist. Satu-satunya warna adalah merah *ember* untuk titik "tahap saat ini", tenggat lewat,
dan keadaan error/destruktif. Aturan lengkap dan komponen ada di [`DESIGN.md`](DESIGN.md). Rel status lima stasiun
adalah elemen khasnya. Mendukung tema gelap, `prefers-reduced-motion`, palet pencarian `Ctrl/⌘ K`, dan navigasi keyboard.

## Pengembangan

```bash
pnpm install
pnpm dev            # http://localhost:5173, /api diproksikan ke http://localhost:5000 (ubah lewat API_PROXY)
pnpm typecheck
pnpm build && pnpm start
```

Env saat runtime: `API_INTERNAL_URL` (alamat API dari server SSR). Saat build: `VITE_SITE_URL` (URL kanonis).

## CI/CD

`.github/workflows/deploy.yml` berjalan di setiap push ke `main`: typecheck, lint, dan build; lalu image di-push ke
`ghcr.io/mrfroglab/sampaimana`; lalu runner self-hosted di server menjalankan `docker compose pull web && up -d --no-deps web`
dan mengecek health. Pull request hanya menjalankan test.

## Setup awal server

```bash
ADMIN_EMAIL=email@anda.com SEED_DEMO=true ./deploy/deploy.sh
```

Skrip ini membangun image API & web, menyiapkan `/opt/stacks/apps/sampaimana` (Postgres, API, web) dengan rahasia
yang dibuat sekali di `.env` (izin 600), lalu memasang blok Caddy untuk `sampaimana.hallojanu.me`. Aman dijalankan
ulang untuk update; migrasi database berjalan otomatis saat API start.

## Operasional

Backup harian, salinan di luar server, notifikasi kegagalan, dan cara restore: lihat [`deploy/OPS.md`](deploy/OPS.md).
