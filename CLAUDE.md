# CLAUDE.md — Sampai Mana web

Instruksi untuk agen AI (Claude Code dan sejenisnya) yang mengerjakan repo ini. Pasangan repo ini adalah
`mrfroglab/api-sampaimana`, yang punya CLAUDE.md sendiri.

## Konteks cepat

- React Router 7 (SSR) + TypeScript + Tailwind 4. Rute di `app/routes.ts`, token desain di `app/app.css`, komponen dasar di
  `app/components/ui.tsx`.
- Gambaran sistem: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Alur kerja: [CONTRIBUTING.md](CONTRIBUTING.md).
- **Merge/push ke `main` = deploy ke produksi.** Jangan push ke `main` atau merge PR tanpa persetujuan eksplisit pengelola.
- `PRD.md` (dokumen kebutuhan produk) ada di root checkout utama repo ini, di-*gitignore*. Baca bila ada, untuk memahami tujuan
  dan prioritas produk. Di worktree, file itu tidak ikut: cari di checkout utama.

## Dokumentasi harus tetap sinkron

[docs/README.md](docs/README.md) adalah peta semua dokumen di kedua repo, lengkap dengan sumber kebenaran tiap topik. Aturannya:

1. **Setiap perubahan kode memperbarui dokumennya di commit/PR yang sama.** Cek kolom "Perbarui bila" di peta.
2. **Satu fakta, satu tempat.** Jangan menyalin isi dokumen lain; tautkan saja. Jangan membuat dokumen baru untuk topik yang sudah
   punya pemilik. Dokumen baru wajib didaftarkan di peta (dicek otomatis).
3. **Jangan menulis angka yang cepat basi** di dokumen, seperti jumlah test.
4. **Jangan mengedit `CHANGELOG.md` manual.** Jalankan `pnpm changelog` dan commit sebagai `docs(changelog): update`, sebagai commit
   terakhir sebelum membuka PR dan setelah setiap rebase. Bila rebase konflik di file itu, jalankan ulang skripnya.
5. **Perubahan yang menyentuh repo API** (endpoint di `/data`, metodologi di `/tren`, data pribadi baru di Kebijakan Privasi):
   lihat tabel "Perubahan lintas repo" di peta.
6. Sebelum selesai: `pnpm typecheck && pnpm lint && pnpm build && pnpm docs:check`.

Halaman `/privasi` dan `/ketentuan` dirender langsung dari `docs/legal/PRIVACY.md` dan `docs/legal/TERMS.md`. Ubah isi di file
Markdown itu, jangan di komponen. Isi legal adalah keputusan pengelola: jangan mengubah substansinya tanpa diminta.

Janji redaksi kepada publik ada di `app/routes/about.tsx` (`/tentang`). Panduan internalnya, [docs/EDITORIAL.md](docs/EDITORIAL.md),
harus selalu sejalan. Ubah keduanya bersamaan.

## Aturan lain

- Commit memakai Conventional Commits (lihat CONTRIBUTING.md). Pesan commit dalam bahasa Inggris, teks UI dan dokumen dalam bahasa
  Indonesia.
- Jangan menambahkan trailer atribusi AI (`Co-Authored-By: Claude` dan sejenisnya) ke commit atau PR.
- QA: jangan memakai kredensial produksi. Pakai Postgres lokal sementara dan pengguna QA dari seed, lalu bersihkan.
- Ikuti [DESIGN.md](DESIGN.md) untuk setiap perubahan UI. Satu-satunya warna aksen adalah `ember`.
