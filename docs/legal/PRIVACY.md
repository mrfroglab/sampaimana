# Kebijakan Privasi

Berlaku sejak: [TANGGAL-BERLAKU]

Sampai Mana (`sampaimana.hallojanu.me`) dikelola oleh [NAMA-PENGELOLA] ("kami"). Kebijakan ini menjelaskan data pribadi apa yang
kami kumpulkan, untuk apa, berapa lama kami menyimpannya, dan hak Anda atasnya, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang
Pelindungan Data Pribadi (UU PDP).

Pertanyaan atau permintaan terkait data pribadi: **[EMAIL-KONTAK]**.

## 1. Data yang kami kumpulkan

### Bila Anda hanya membaca situs

Anda tidak perlu akun untuk membaca kasus, statistik, atau mengunduh data. Kami **tidak** memasang cookie pelacak atau iklan.

- **Alamat IP** dipakai sementara di memori untuk membatasi jumlah permintaan (*rate limit*) dan melindungi situs dari
  penyalahgunaan. Log teknis server dan Cloudflare dapat memuat alamat IP, waktu akses, dan alamat halaman.
- **Analitik.** Cloudflare Web Analytics menghitung kunjungan tanpa cookie dan tanpa membuat profil pengunjung.
- **Preferensi tema** (terang/gelap) disimpan di `localStorage` peramban Anda dan tidak pernah dikirim ke kami.

### Bila Anda membuat akun

| Data | Untuk apa |
| --- | --- |
| Nama dan alamat email | Masuk, menampilkan nama Anda pada kontribusi, mengirim notifikasi |
| Kata sandi | Disimpan hanya sebagai *hash* bcrypt; kami tidak bisa melihat kata sandi Anda |
| Rahasia verifikasi dua langkah (bila diaktifkan) | Disimpan terenkripsi; kode pemulihan disimpan sebagai *hash* |
| Sesi masuk: waktu dan *user agent* peramban | Supaya Anda bisa melihat dan mencabut sesi aktif di pengaturan akun |
| Jumlah gagal masuk dan waktu penguncian | Melindungi akun dari tebakan kata sandi |
| Kasus yang Anda ikuti dan notifikasi Anda | Memberi kabar perkembangan kasus |
| Alamat IP pada peristiwa keamanan akun (mengganti sandi, mengaktifkan/mematikan 2FA, akun terkunci) | Menyelidiki penyalahgunaan akun |

Satu cookie dipasang setelah Anda masuk: `sm_rt`, cookie `httpOnly` yang menjaga sesi Anda. Cookie ini wajib agar fitur akun
berjalan dan tidak dipakai untuk hal lain.

### Bila Anda mengirim kontribusi

Isi laporan, tautan, dan file bukti (gambar, PDF, dokumen, audio) yang Anda unggah. File bukti disimpan **privat** di server kami
dan hanya bisa dibuka redaksi. Redaksi juga melihat riwayat kontribusi Anda (berapa yang diterima atau ditolak) untuk menilai
kiriman baru.

Bila kontribusi diterima, isinya bisa menjadi bagian dari linimasa kasus yang publik, dan tautan bukti bisa ditampilkan sebagai
sumber. File yang Anda unggah tidak dipublikasikan.

### Bila Anda mengajukan koreksi atau hak jawab

Nama, email, hubungan Anda dengan kasus, dan isi pesan. Data ini hanya dilihat redaksi. Bila koreksi diterapkan, kami bisa
memuat catatan koreksi di riwayat kasus. Catatan itu tidak mencantumkan email Anda.

### Data tentang orang dalam kasus

Situs ini memuat nama dan status hukum orang yang terlibat dalam perkara (misalnya tersangka, terdakwa, terpidana) serta lembaga
yang menanganinya. Data ini berasal dari sumber publik seperti dokumen pengadilan, rilis resmi aparat, dan pemberitaan, dan
diolah untuk kepentingan publik atas proses hukum yang terbuka. Kami tidak memuat identitas anak atau korban kekerasan seksual.

Orang yang disebut dalam sebuah kasus berhak meminta koreksi dan menyampaikan tanggapan lewat tombol **Ajukan koreksi** di halaman
kasus. Lihat juga [kebijakan koreksi dan hak jawab](/tentang#koreksi).

## 2. Dasar pemrosesan

- **Perjanjian**: data akun dan kontribusi diperlukan untuk memberikan layanan yang Anda minta.
- **Persetujuan**: notifikasi email (bisa dimatikan kapan saja di pengaturan akun).
- **Kepentingan yang sah**: keamanan situs (rate limit, log keamanan akun) dan pengelolaan redaksi.
- **Kepentingan publik**: pencatatan proses hukum yang bersifat terbuka.

## 3. Pihak lain yang menerima data

Kami **tidak menjual** data pribadi dan tidak membagikannya untuk iklan. Beberapa penyedia layanan memproses data atas nama kami:

| Penyedia | Data | Keterangan |
| --- | --- | --- |
| Cloudflare, Inc. | Alamat IP, permintaan HTTP | Jaringan, keamanan, dan analitik tanpa cookie. Dapat diproses di luar Indonesia. Bila verifikasi anti-bot (Turnstile) aktif di formulir pendaftaran, Cloudflare juga menerima alamat IP pendaftar. |
| Have I Been Pwned (Pwned Passwords) | Bukan data pribadi | Untuk menolak kata sandi yang pernah bocor, kami hanya mengirim 5 karakter pertama *hash* kata sandi. Kata sandi dan email Anda tidak dikirim. |
| Penyedia email (bila notifikasi email aktif) | Nama dan email penerima, isi notifikasi | Hanya untuk mengirim email notifikasi. |

Kami dapat membuka data bila diwajibkan oleh peraturan perundang-undangan atau perintah pengadilan.

## 4. Berapa lama data disimpan

| Data | Lama penyimpanan |
| --- | --- |
| Akun, kasus yang diikuti, notifikasi | Selama akun ada. Dihapus bila Anda meminta penghapusan akun. |
| Sesi masuk | Sampai keluar, dicabut, atau kedaluwarsa (paling lama 30 hari sejak terakhir dipakai) |
| Kontribusi dan file bukti | Selama diperlukan sebagai arsip verifikasi redaksi. Bisa diminta dihapus. |
| Permintaan koreksi | Sebagai bagian dari catatan redaksi. Catatan koreksi yang sudah dimuat di riwayat kasus tetap dipertahankan. |
| Log keamanan dan audit | Selama diperlukan untuk keamanan dan akuntabilitas redaksi |
| Cadangan (*backup*) | Cadangan harian disimpan 7 hari dan cadangan mingguan 4 minggu. Data yang sudah dihapus bisa masih ada di cadangan sampai cadangan itu terhapus otomatis. |

## 5. Keamanan

Koneksi dienkripsi (HTTPS). Kata sandi dan kode pemulihan disimpan sebagai *hash*, rahasia 2FA dienkripsi, file bukti tidak bisa
diakses publik, dan akses redaksi dibatasi per peran. Setiap tindakan redaksi dicatat. Bila terjadi kegagalan pelindungan data
pribadi, kami memberi tahu Anda dan otoritas yang berwenang paling lambat 3×24 jam sesuai UU PDP.

## 6. Hak Anda

Sesuai UU PDP, Anda berhak:

- mendapat informasi tentang pemrosesan data Anda,
- mengakses dan memperoleh salinan data Anda,
- memperbaiki data yang keliru (nama dapat diubah sendiri di pengaturan akun),
- meminta penghapusan data dan akun Anda,
- menarik persetujuan, misalnya mematikan notifikasi email,
- mengajukan keberatan atas pemrosesan tertentu.

Kirim permintaan ke **[EMAIL-KONTAK]** dari email yang terdaftar. Kami dapat meminta konfirmasi identitas, lalu menanggapi paling
lambat 3×24 jam.

## 7. Anak

Layanan akun ditujukan bagi pengguna berusia 18 tahun ke atas, atau yang telah mendapat izin orang tua/wali.

## 8. Perubahan kebijakan

Kami akan memperbarui tanggal di bagian atas setiap kali kebijakan ini berubah. Perubahan penting diumumkan di situs. Riwayat
lengkap perubahan dokumen ini tersedia secara publik di repositori kode Sampai Mana.
