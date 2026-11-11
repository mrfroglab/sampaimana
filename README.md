# Sampai Mana — Web

Situs publik dan meja redaksi untuk **Sampai Mana**, pelacak perkembangan kasus hukum publik di Indonesia.
Backend-nya ada di [`mrfroglab/api-sampaimana`](https://github.com/mrfroglab/api-sampaimana).

React 19 · React Router 7 (framework mode, SSR) · TypeScript · Tailwind CSS 4 · Vite 7

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Masthead, posisi kasus per tahap, kasus yang baru bergerak, kasus paling lama tertahan, catatan redaksi |
| `/kasus` | Pencarian dan filter (tahap, kategori, urutan) berbasis URL, dengan paginasi |
| `/kasus/:slug` | Rel status, linimasa, sumber terverifikasi, pihak terkait, riwayat perubahan, ikuti, bagikan, ajukan koreksi |
| `/kasus/:slug/tahap/:stageId` | Artikel penjelasan per tahap |
| `/kasus/:slug/og.png` | Gambar pratinjau (Open Graph) per kasus, dirender di server |
| `/orang/:slug` | Halaman pihak: semua kasus yang menyebut orang itu |
| `/instansi` | Daftar lembaga yang menangani kasus |
| `/instansi/:slug` | Kasus yang ditangani satu lembaga |
| `/statistik` | Durasi rata-rata dan median per tahap, sebaran tahap dan kategori |
| `/tren` | Lembaga paling lambat dan durasi per kategori, hanya dari tahapan terverifikasi, lengkap dengan jumlah sampel dan metodologi |
| `/data` | Unduhan CSV/JSON dan dokumentasi API publik |
| `/tentang` | Metodologi, verifikasi, kebijakan koreksi dan hak jawab, penafian |
| `/privasi` | Kebijakan Privasi, dirender dari [`docs/legal/PRIVACY.md`](docs/legal/PRIVACY.md) |
| `/ketentuan` | Syarat & Ketentuan, dirender dari [`docs/legal/TERMS.md`](docs/legal/TERMS.md) |
| `/tanam` | Pembuat kode widget kasus untuk dipasang di situs lain |
| `/embed/kasus/:slug` | Widget kasus (boleh di-*iframe* dari situs mana pun) |
| `/embed.js` | Skrip pemasang widget |
| `/masuk`, `/daftar` | Masuk (dengan verifikasi dua langkah bila aktif) dan pendaftaran |
| `/kontribusi/baru` | Formulir kontribusi dengan bukti tautan atau file |
| `/akun/*` | Kasus yang diikuti, notifikasi, kontribusi, pengaturan (profil, kata sandi, 2FA, sesi aktif) |
| `/redaksi/*` | Meja redaksi: ringkasan dan "perlu dicek", kasus (linimasa, artikel, sumber, impor SIPP), moderasi, koreksi, kategori, pengguna, log audit |
| `/sitemap.xml`, `/robots.txt` | Untuk mesin pencari |

Halaman publik dirender di server (SEO, Open Graph per kasus, JSON-LD). Halaman akun dan redaksi dimuat di klien setelah sesi
dipulihkan. Tabel ini dicek otomatis terhadap `app/routes.ts` oleh `pnpm docs:check`.

## Autentikasi

Access token hanya disimpan di memori. Saat halaman dibuka, klien meminta token baru lewat `POST /api/auth/refresh` memakai cookie
`httpOnly` dari API (satu domain, jadi tanpa CORS). Tidak ada token di `localStorage`. Rinciannya ada di
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#alur-autentikasi).

## Desain

Grid editorial berbasis zinc dengan satu warna aksen oranye *ember*. Aturan, token, dan komponennya ada di [DESIGN.md](DESIGN.md).
Mendukung tema gelap, `prefers-reduced-motion`, palet pencarian `Ctrl/⌘ K`, dan navigasi keyboard.

## Pengembangan

```bash
pnpm install
pnpm dev            # http://localhost:5173, /api diproksikan ke http://localhost:5000 (ubah lewat API_PROXY)
pnpm typecheck
pnpm lint
pnpm build && pnpm start
pnpm docs:check     # dokumentasi sinkron dengan kode (lihat docs/README.md)
pnpm changelog      # buat ulang CHANGELOG.md dari riwayat commit
```

Env saat runtime: `API_INTERNAL_URL` (alamat API dari server SSR). Saat build: `VITE_SITE_URL` (URL kanonis).

Alur branch, commit, dan PR: [CONTRIBUTING.md](CONTRIBUTING.md).

## CI/CD

`.github/workflows/deploy.yml` berjalan di setiap push ke `main`: typecheck, lint, build, dan `docs:check`; lalu image di-push ke
`ghcr.io/mrfroglab/sampaimana`; lalu runner self-hosted di server menjalankan `docker compose pull web && up -d --no-deps web` dan
mengecek health. Pull request hanya menjalankan test.

## Setup awal server

```bash
ADMIN_EMAIL=email@anda.com SEED_DEMO=true ./deploy/deploy.sh
```

Skrip ini membangun image API dan web, menyiapkan `/opt/stacks/apps/sampaimana` (Postgres, API, web) dengan rahasia yang dibuat
sekali di `.env` (izin 600), lalu memasang blok Caddy untuk `sampaimana.hallojanu.me`. Aman dijalankan ulang. Perubahan pada
`deploy/docker-compose.yml` atau blok Caddy hanya berlaku setelah skrip ini dijalankan lagi, karena CI hanya mengganti image.

## Dokumentasi

Semua dokumen di kedua repo, beserta aturan menjaganya tetap sinkron, tercantum di **[docs/README.md](docs/README.md)**. Yang
paling sering dibuka:

- [deploy/OPS.md](deploy/OPS.md): backup, restore, dan runbook insiden
- [docs/EDITORIAL.md](docs/EDITORIAL.md): panduan kerja redaksi
- [SECURITY.md](SECURITY.md): cara melaporkan celah keamanan
- [CHANGELOG.md](CHANGELOG.md): perubahan per tanggal

## Lisensi

Kode: [GNU AGPL-3.0](LICENSE). Data kasus: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.id).
