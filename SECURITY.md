# Kebijakan keamanan

Berlaku untuk kedua repo Sampai Mana ([web](https://github.com/mrfroglab/sampaimana) dan
[API](https://github.com/mrfroglab/api-sampaimana)) serta situs `sampaimana.hallojanu.me`.

## Melaporkan celah keamanan

**Jangan membuka issue publik untuk celah keamanan.** Laporkan secara privat lewat salah satu cara ini:

- tombol **Report a vulnerability** di tab *Security* repo yang bersangkutan (GitHub private vulnerability reporting), atau
- email ke **[EMAIL-KONTAK]** dengan subjek `[SECURITY] Sampai Mana`.

Sertakan:

- jenis celah dan dampaknya,
- langkah untuk mereproduksi (URL, permintaan HTTP, atau potongan kode),
- versi atau commit bila Anda menguji dari kode,
- nama yang ingin dicantumkan sebagai penemu (opsional).

## Yang kami lakukan

| Tahap | Target |
| --- | --- |
| Konfirmasi laporan diterima | 3 hari kerja |
| Penilaian awal dan tingkat keparahan | 7 hari kerja |
| Perbaikan celah kritis/tinggi | secepatnya, target 30 hari |

Kami memberi kabar perkembangan, dan mencantumkan nama Anda di catatan perbaikan bila Anda mau. Mohon beri kami waktu memperbaiki
sebelum mengungkap celah ke publik.

## Batasan pengujian

Silakan menguji dengan itikad baik, dengan batasan berikut:

- **Pakai akun Anda sendiri.** Jangan mengakses, mengubah, atau menghapus data orang lain, termasuk file bukti kontribusi.
- **Jangan** melakukan serangan DoS, *brute force* massal, rekayasa sosial terhadap redaksi, atau serangan fisik.
- **Jangan** mengirim kontribusi atau permintaan koreksi palsu dalam jumlah besar. Antrean itu dikerjakan manusia.
- Lebih baik lagi, jalankan stack di mesin Anda sendiri (lihat README kedua repo) dan uji di sana.
- Bila tanpa sengaja melihat data pribadi, berhenti, jangan simpan, dan sebutkan dalam laporan.

Pengujian yang mengikuti kebijakan ini kami anggap sah, dan kami tidak akan menempuh jalur hukum terhadapnya.

## Di luar cakupan

- Temuan dari pemindai otomatis tanpa bukti dampak.
- Header yang hilang tanpa skenario serangan yang nyata.
- Rate limit pada endpoint yang tidak sensitif.
- Celah pada layanan pihak ketiga (Cloudflare, GitHub). Laporkan ke penyedianya.
- Beacon `static.cloudflareinsights.com` di CSP: itu disengaja, disisipkan Cloudflare di edge.

## Versi yang didukung

Hanya versi yang sedang berjalan di produksi, yaitu branch `main` kedua repo.
