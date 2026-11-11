# Peta dokumentasi Sampai Mana

Sampai Mana terdiri dari dua repo: **web** ([`mrfroglab/sampaimana`](https://github.com/mrfroglab/sampaimana), repo ini) dan
**API** ([`mrfroglab/api-sampaimana`](https://github.com/mrfroglab/api-sampaimana)). Halaman ini adalah daftar induk semua dokumen
di kedua repo. Setiap topik punya **satu** dokumen pemilik; dokumen lain cukup menautkan ke sana.

## Aturan sinkronisasi

1. **Dokumen tinggal di repo tempat kodenya.** Perilaku API didokumentasikan di repo API, halaman web dan server di repo web.
   Dengan begitu perubahan kode dan dokumennya selalu masuk dalam PR yang sama.
2. **Satu fakta, satu tempat.** Kalau sebuah fakta sudah punya pemilik di tabel di bawah, tautkan ke sana. Jangan menyalin isinya.
   Contoh: daftar env ada di `.env.example` API, bukan di README.
3. **Ubah kode = ubah dokumennya di PR yang sama.** Kolom "Perbarui bila" di bawah memberi tahu dokumen mana yang ikut berubah.
4. **Jangan tulis angka yang cepat basi** (jumlah test, jumlah endpoint, jumlah kasus). Sebut perintah atau sumbernya.
5. **`CHANGELOG.md` tidak pernah diedit manual.** Isinya dibuat dari commit `feat`/`fix`/`perf`/`security`. Kalau terjadi konflik
   saat rebase, ambil salah satu sisi lalu jalankan `pnpm changelog` lagi.
6. **`pnpm docs:check` harus hijau.** Pemeriksaan ini jalan di CI kedua repo. Rinciannya ada di [Pemeriksaan otomatis](#pemeriksaan-otomatis).

## Repo web (repo ini)

| Dokumen | Isi | Sumber kebenaran | Perbarui bila |
| --- | --- | --- | --- |
| [README.md](../README.md) | Ringkasan, daftar rute, cara menjalankan, CI/CD | `app/routes.ts`, `package.json` | rute ditambah atau diubah, perintah berubah |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Alur kerja kedua repo: branch, commit, PR, merge, QA | — | alur kerja berubah |
| [CLAUDE.md](../CLAUDE.md) | Instruksi untuk agen AI yang mengerjakan repo ini | dokumen ini | aturan kerja berubah |
| [SECURITY.md](../SECURITY.md) | Cara melaporkan celah keamanan (berlaku untuk kedua repo) | — | kontak atau kebijakan berubah |
| [CHANGELOG.md](../CHANGELOG.md) | Perubahan per tanggal | riwayat commit (otomatis) | jangan diedit, jalankan `pnpm changelog` |
| [DESIGN.md](../DESIGN.md) | Sistem desain: token, aturan, komponen | `app/app.css`, `app/components/ui.tsx` | token atau komponen dasar berubah |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md) | Gambaran sistem, alur auth, data, deploy | `deploy/docker-compose.yml`, `app/lib/session.ts` | komponen sistem, alur auth, atau topologi berubah |
| [docs/EDITORIAL.md](EDITORIAL.md) | Panduan kerja redaksi (internal) | `app/routes/about.tsx` untuk komitmen publik | kebijakan redaksi atau alur moderasi berubah |
| [docs/legal/PRIVACY.md](legal/PRIVACY.md) | Kebijakan Privasi, tampil di `/privasi` | `prisma/schema.prisma` (API), pihak ketiga di kode | data pribadi atau pihak ketiga baru disimpan/dikirim |
| [docs/legal/TERMS.md](legal/TERMS.md) | Syarat & Ketentuan, tampil di `/ketentuan` | — | aturan pemakaian, kontribusi, atau akun berubah |
| [deploy/OPS.md](../deploy/OPS.md) | Operasional server: backup, restore, runbook insiden | `deploy/` | skrip deploy/backup atau prosedur berubah |
| [.github/pull_request_template.md](../.github/pull_request_template.md) | Checklist PR | dokumen ini | aturan sinkronisasi berubah |

## Repo API

| Dokumen | Isi | Sumber kebenaran | Perbarui bila |
| --- | --- | --- | --- |
| [README.md](https://github.com/mrfroglab/api-sampaimana/blob/main/README.md) | Fitur, keamanan, menjalankan, test, CI/CD | kode | fitur atau perilaku keamanan berubah |
| [CONTRIBUTING.md](https://github.com/mrfroglab/api-sampaimana/blob/main/CONTRIBUTING.md) | Hal khusus API: migrasi, test, OpenAPI | — | aturan migrasi atau test berubah |
| [CLAUDE.md](https://github.com/mrfroglab/api-sampaimana/blob/main/CLAUDE.md) | Instruksi agen AI untuk repo API | — | aturan kerja berubah |
| [SECURITY.md](https://github.com/mrfroglab/api-sampaimana/blob/main/SECURITY.md) | Menunjuk ke SECURITY.md repo web | — | — |
| [CHANGELOG.md](https://github.com/mrfroglab/api-sampaimana/blob/main/CHANGELOG.md) | Perubahan per tanggal | riwayat commit (otomatis) | jangan diedit, jalankan `pnpm changelog` |
| [docs/METHODOLOGY.md](https://github.com/mrfroglab/api-sampaimana/blob/main/docs/METHODOLOGY.md) | Cara durasi, tren, dan "perlu dicek" dihitung | `src/lib/durations.js`, `src/lib/attention.js` | rumus atau ambang berubah |
| [docs/SIPP-IMPORT.md](https://github.com/mrfroglab/api-sampaimana/blob/main/docs/SIPP-IMPORT.md) | Panduan impor SIPP untuk redaksi | `src/lib/sipp.js`, `src/lib/stages.js` | parser atau aturan usulan berubah |
| `.env.example` | Daftar lengkap env beserta artinya | `src/config/env.js` | env ditambah, dihapus, atau defaultnya berubah |
| `/api/docs` (OpenAPI) | Referensi endpoint | `src/docs/openapi.js` | endpoint ditambah atau diubah |

`PRD.md` (dokumen kebutuhan produk) sengaja **tidak** ada di repo karena kedua repo publik. File itu di-*gitignore* dan hanya
ada di root checkout utama repo web milik pengelola.

## Perubahan lintas repo

Beberapa perubahan di API menuntut dokumen di repo web, dan sebaliknya. Pemeriksaan otomatis tidak bisa melihat lintas repo,
jadi checklist PR yang menjaganya:

| Perubahan di… | Dokumen yang ikut diperbarui |
| --- | --- |
| API: data pribadi baru disimpan, retensi berubah, atau pihak ketiga baru dipanggil | web `docs/legal/PRIVACY.md` |
| API: env baru yang perlu diisi di server | web `deploy/docker-compose.yml` + `deploy/OPS.md` |
| API: endpoint publik baru atau berubah | web `app/routes/data.tsx` (daftar endpoint di `/data`) |
| API: rumus tren/durasi berubah | API `docs/METHODOLOGY.md` + web `app/routes/trends.tsx` (teks metodologi) |
| Web: kebijakan koreksi/verifikasi di `/tentang` berubah | web `docs/EDITORIAL.md` |
| Salah satu: alur kerja berubah | web `CONTRIBUTING.md` + `CLAUDE.md` di kedua repo |

Kerjakan perubahan lintas repo sebagai dua PR yang saling menautkan. Merge API dulu bila web bergantung pada endpoint baru.

## Pemeriksaan otomatis

`pnpm docs:check` (`scripts/docs-check.mjs`) jalan di CI kedua repo dan gagal bila:

| Pemeriksaan | Web | API |
| --- | --- | --- |
| Tautan relatif di Markdown menunjuk file yang ada | ✓ | ✓ |
| Tidak ada angka yang cepat basi seperti jumlah test | ✓ | ✓ |
| Setiap file `.md` tercantum di peta (di sini, atau di README API) | ✓ | ✓ |
| `CHANGELOG.md` sesuai riwayat commit | ✓ | ✓ |
| Tabel rute README = `app/routes.ts` | ✓ | |
| Warna di `DESIGN.md` ada di `app/app.css` | ✓ | |
| Dokumen legal dan SECURITY.md tidak berisi placeholder | ✓ | |
| `.env.example` = skema `src/config/env.js` | | ✓ |
| Setiap rute Express tercantum di OpenAPI | | ✓ |
