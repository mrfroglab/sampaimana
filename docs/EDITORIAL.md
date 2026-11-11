# Panduan redaksi

Panduan kerja internal untuk EDITOR dan SUPER_ADMIN di meja redaksi (`/redaksi`).

**Komitmen kepada publik** (lima tahap, standar verifikasi, target tanggapan koreksi, penafian) ditulis di halaman `/tentang`
(`app/routes/about.tsx`). Itulah janji yang mengikat. Panduan ini menjelaskan cara menepatinya dan tidak boleh bertentangan
dengannya. Kalau salah satu berubah, ubah keduanya di PR yang sama.

## 1. Kasus yang layak dimuat

Muat sebuah kasus bila **semua** syarat ini terpenuhi:

- **Menyangkut kepentingan publik**: korupsi, penyalahgunaan wewenang, kekerasan oleh aparat, lingkungan, pelanggaran HAM,
  kasus dengan korban massal, atau perkara yang melibatkan pejabat publik.
- **Proses hukumnya resmi berjalan**: setidaknya ada laporan polisi atau pengaduan yang terdokumentasi, atau nomor perkara.
- **Ada minimal satu sumber yang bisa diperiksa**: dokumen resmi, SIPP, rilis aparat, atau liputan media kredibel.

Jangan muat:

- sengketa pribadi tanpa dimensi publik,
- perkara yang identitas pihaknya wajib dirahasiakan dan kasusnya tidak bisa diceritakan tanpa identitas itu (lihat bagian 3),
- kasus yang hanya bersumber dari unggahan media sosial.

## 2. Verifikasi sumber

Sumber ditandai **terverifikasi** hanya bila redaksi sudah memeriksa:

1. tautannya aktif, atau ada arsipnya (simpan ke web.archive.org bila perlu),
2. isinya benar-benar mendukung klaim pada tahapan itu,
3. penerbitnya jelas dan berwenang (pengadilan, kejaksaan, kepolisian, KPK, lembaga resmi, atau media yang menjalankan kerja
   redaksi).

Urutan kekuatan sumber: `COURT` (putusan, SIPP, dokumen sidang) > `OFFICIAL` (rilis aparat/lembaga) > `MEDIA` > `OTHER`.

Status terverifikasi punya akibat nyata: **tren dan durasi di `/tren` hanya menghitung tahapan yang punya sumber
terverifikasi** (lihat `docs/METHODOLOGY.md` di repo API). Jangan menandai terverifikasi hanya untuk membuat grafik terisi.

## 3. Menulis tentang orang

- **Praduga tak bersalah.** Pakai istilah sesuai dokumen resmi pada tanggalnya: terlapor, tersangka, terdakwa, terpidana. Jangan
  memakai "pelaku" sebelum ada putusan berkekuatan hukum tetap.
- **Anak** (di bawah 18 tahun), baik sebagai pelaku, korban, maupun saksi: **jangan** cantumkan nama, foto, sekolah, alamat,
  atau detail lain yang bisa mengungkap identitasnya (UU 11/2012 tentang Sistem Peradilan Pidana Anak).
- **Korban kekerasan seksual**: jangan cantumkan identitasnya (UU 12/2022 tentang Tindak Pidana Kekerasan Seksual).
- **Pihak di kolom "pihak terkait"** hanya untuk orang yang berstatus hukum dalam perkara itu. Saksi tidak dimasukkan.
- Halaman `/orang/:slug` terindeks mesin pencari. Pertimbangkan dampaknya sebelum memasukkan nama orang yang bukan pejabat publik.

## 4. Tahapan dan status

- Menambah tahapan berstatus **AKTIF** otomatis menutup tahapan sebelumnya dan menggeser status kasus. Pengikut kasus menerima
  notifikasi.
- Perubahan status langsung **wajib disertai alasan**. Alasan itu tampil publik di riwayat perubahan, jadi tulis dengan jelas
  dan sebut sumbernya.
- Isi **tenggat** (`dueAt`) bila ada batas yang diketahui: masa penahanan, jadwal sidang berikutnya, batas waktu banding. Tenggat
  yang terlewat ditandai di situs dan masuk daftar "perlu dicek".
- Impor dari SIPP: ikuti `docs/SIPP-IMPORT.md` di repo API.

## 5. Rutinitas harian

Halaman ringkasan redaksi dan email/notifikasi pagi (setelah 07:00 WIB) berisi tiga daftar:

| Daftar | Artinya | Tindakan |
| --- | --- | --- |
| Lewat tenggat | Tahapan aktif yang tenggatnya sudah lewat | Cari kabar terbaru. Tambah tahapan baru, perbarui tenggat, atau tulis catatan bahwa belum ada kabar. |
| Jatuh tempo ≤ 7 hari | Tenggat dalam seminggu | Siapkan pemantauan: jadwal sidang, rilis. |
| Menggantung | Kasus aktif tanpa aktivitas lebih dari `STALE_DAYS` hari (default 30) | Periksa SIPP/rilis. Kalau memang tidak ada perkembangan, itu juga informasi; catat. |

Filter `?attention=check` di daftar kasus admin menampilkan kasus yang perlu dicek.

## 6. Moderasi kontribusi publik

- Kontribusi **tidak pernah tampil otomatis**. Semuanya masuk antrean `/redaksi/moderasi`.
- Akun berumur kurang dari 24 jam hanya boleh punya 1 kontribusi yang menunggu, akun lain maksimal 5.
- Antrean menampilkan reputasi kontributor (diterima/ditolak/menunggu, tingkat penerimaan). Reputasi baik tidak menggantikan
  verifikasi.
- File bukti bersifat privat. Buka hanya untuk memeriksa, jangan unduh ke perangkat pribadi atau meneruskannya ke luar redaksi.
- **Terima** bila isinya terverifikasi dengan standar bagian 2. Saat menerima, redaksi bisa langsung membuat tahapan baru dan
  mengimpor tautan bukti sebagai sumber. Sumber hasil impor tetap harus diverifikasi terpisah.
- **Tolak** dengan alasan yang sopan dan spesifik (wajib diisi). Alasan itu dikirim ke kontributor sebagai notifikasi.

## 7. Koreksi dan hak jawab

- Formulir koreksi di halaman kasus terbuka untuk siapa pun tanpa akun. Permintaan masuk ke `/redaksi/koreksi`.
- **Target tanggapan: 3×24 jam** (janji publik di `/tentang`). Tangani permintaan dari pihak yang disebut atau kuasa hukumnya
  lebih dulu.
- Tanggapi dengan salah satu: **Diterima / dikoreksi** (data diperbaiki atau tanggapan dimuat) atau **Tidak dikoreksi** (data
  sudah sesuai sumber; tulis alasannya di tanggapan).
- Tanggapan **tidak** dikirim otomatis ke pemohon (formulir koreksi tidak membuat akun, dan email belum aktif). Balas pemohon
  lewat email yang mereka cantumkan.
- Bila koreksi diterapkan atau hak jawab dimuat, isi **catatan publik**. Catatan itu tampil di riwayat perubahan kasus.
  **Jangan pernah menghapus catatan diam-diam**; ralat ditulis sebagai catatan baru.
- Permintaan yang berupa ancaman hukum atau somasi: jangan dibalas sendiri. Teruskan ke pengelola.

## 8. Mengarsipkan kasus

"Hapus" di admin sebenarnya **mengarsipkan**: kasus hilang dari situs publik tetapi tetap ada di admin dan bisa dipulihkan.
Arsipkan hanya bila kasus ternyata salah dimuat (tidak memenuhi bagian 1), ada perintah hukum, atau ada risiko keselamatan bagi
seseorang. Tulis alasannya. Alasan itu tercatat di log audit.

## 9. Akun redaksi

- Aktifkan verifikasi dua langkah (TOTP) di `/akun/pengaturan`. Simpan kode pemulihan di password manager.
- Jangan berbagi akun. Setiap tindakan tercatat atas nama pengguna di log audit.
- Akun yang terkunci karena terlalu banyak gagal masuk bisa dibuka SUPER_ADMIN di `/redaksi/pengguna`.
