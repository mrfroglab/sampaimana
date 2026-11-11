# Berkontribusi ke Sampai Mana

Panduan ini berlaku untuk **kedua** repo: web (repo ini) dan [API](https://github.com/mrfroglab/api-sampaimana). Hal khusus API,
seperti migrasi dan test database, ada di
[CONTRIBUTING.md repo API](https://github.com/mrfroglab/api-sampaimana/blob/main/CONTRIBUTING.md).

Ingin mengirim kabar perkembangan kasus, bukan kode? Pakai formulir di situs (`/kontribusi/baru`). Menemukan celah keamanan? Ikuti
[SECURITY.md](SECURITY.md), jangan buka issue publik.

## Alur kerja

1. **Branch dari `main`** yang terbaru: `git switch -c <nama>/<topik>`. Satu branch untuk satu topik.
2. **Commit kecil dengan format Conventional Commits** (lihat di bawah).
3. **Perbarui dokumen di commit/PR yang sama** dengan perubahan kodenya. [Peta dokumentasi](docs/README.md) memberi tahu dokumen
   mana yang terdampak.
4. **Jalankan pemeriksaan lokal** sebelum push:
   ```bash
   pnpm typecheck && pnpm lint && pnpm build   # web
   pnpm docs:check --no-changelog
   ```
5. **Regenerasi changelog** sebagai commit terakhir sebelum PR dibuka, dan lagi setelah setiap rebase:
   ```bash
   pnpm changelog
   git commit -am "docs(changelog): update"
   ```
6. **Buka PR ke `main`.** Isi checklist di template PR. PR hanya menjalankan test, tidak deploy.
7. **Merge dengan *rebase merge*.** Merge ke `main` = deploy ke produksi otomatis. Jangan merge tanpa persetujuan pengelola.

### Format commit

```
<tipe>(<cakupan opsional>): <ringkasan singkat dalam bahasa Inggris, huruf kecil>
```

| Tipe | Kapan | Masuk CHANGELOG? |
| --- | --- | --- |
| `feat` | Fitur atau perilaku baru yang terasa pengguna | ya, "Fitur" |
| `fix` | Perbaikan bug | ya, "Perbaikan" |
| `fix(security)` / `security` | Perbaikan keamanan | ya, "Keamanan" |
| `perf` | Peningkatan kinerja | ya, "Performa" |
| `docs`, `chore`, `ci`, `test`, `refactor`, `ops`, `style` | Lainnya | tidak |

Tambahkan `!` setelah tipe (`feat!: ...`) untuk perubahan yang merusak kompatibilitas, misalnya respons API yang berubah bentuk.

### Kenapa CHANGELOG tidak bertabrakan

`CHANGELOG.md` dibuat ulang dari riwayat commit oleh `scripts/changelog.mjs` dan tidak pernah diedit manual. Kalau dua branch
sama-sama mengubahnya dan rebase konflik, ambil sisi mana saja, jalankan `pnpm changelog`, lalu lanjutkan rebase. Hasilnya selalu
sama karena dihitung dari commit. CI menolak PR yang changelog-nya belum diregenerasi.

## Perubahan lintas repo

Bila sebuah fitur menyentuh API dan web:

1. Buat PR di kedua repo dan saling tautkan di deskripsi.
2. **Merge API dulu** bila web memakai endpoint atau field baru. API harus tetap kompatibel dengan web versi lama selama jeda
   antara dua deploy.
3. Periksa tabel [perubahan lintas repo](docs/README.md#perubahan-lintas-repo) untuk dokumen yang ikut berubah di repo lain.

## Aturan QA

- **Jangan pernah memakai kredensial produksi** untuk pengujian. Jalankan Postgres lokal sementara dan buat pengguna QA lewat seed
  (lihat README API), lalu hapus setelah selesai.
- Data produksi hanya boleh disentuh dengan persetujuan eksplisit pengelola, dan hanya baca.
- Uji perubahan UI di peramban: tema terang dan gelap, lebar ponsel, dan navigasi keyboard.

## Gaya

- **Web:** ikuti [DESIGN.md](DESIGN.md). Pakai komponen di `app/components/ui.tsx` sebelum membuat yang baru.
- **Bahasa:** teks UI, dokumen, dan pesan error dalam bahasa Indonesia. Kode, komentar, dan pesan commit dalam bahasa Inggris.
- **Penulisan:** ikuti istilah hukum di [panduan redaksi](docs/EDITORIAL.md#3-menulis-tentang-orang) (tersangka, terdakwa,
  terpidana; tidak memakai "pelaku" sebelum putusan inkrah).

## Lisensi

Dengan berkontribusi, Anda setuju kontribusi kode Anda dirilis dengan lisensi [AGPL-3.0](LICENSE).
