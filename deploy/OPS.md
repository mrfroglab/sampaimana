# Operasional Sampai Mana

Server: satu mesin, stack Docker di `/opt/stacks/apps/sampaimana` (db, api, web), Caddy + Cloudflare Tunnel di depannya.
Deploy rutin lewat CI/CD (push ke `main`). Dokumen ini untuk hal di luar itu.

## Backup

Backup berjalan harian pukul 02:30 WIB lewat systemd *user* timer `sampaimana-backup.timer`
(`Persistent=true`: kalau mesin mati pada jam itu, backup dijalankan saat menyala lagi).

Isi satu backup di `/opt/stacks/backup/sampaimana/daily/<tanggal_jam>/`:

| File | Isi |
|---|---|
| `db.dump` | `pg_dump -Fc` seluruh database (sudah dicek bisa dibaca dengan `pg_restore --list`) |
| `uploads.tar.gz` | folder `data/uploads` (berkas bukti kontribusi) |
| `SHA256SUMS` | checksum kedua berkas |

Rotasi: 7 backup harian dan 4 backup mingguan (salinan hari Minggu masuk `weekly/`).
Status terakhir ada di `/opt/stacks/backup/sampaimana/last-status.json`.

### Pasang / perbarui

```bash
deploy/backup/install.sh          # menyalin backup.sh, membuat backup.env (mode 600) bila belum ada, memasang timer
systemctl --user list-timers sampaimana-backup.timer
journalctl --user -u sampaimana-backup.service -n 30
```

Butuh `loginctl enable-linger $USER` agar timer user tetap jalan tanpa sesi login.

### Salinan di luar server (wajib untuk benar-benar aman)

> **TODO (belum disiapkan, per 2026-11-10):** tempat penyimpanan salinan luar server belum ada. Token `gdrive:` di rclone
> sudah kedaluwarsa dan `BACKUP_REMOTE` masih kosong, jadi backup saat ini hanya tersimpan di mesin yang sama.
> Siapkan tujuannya (saran: bucket Cloudflare R2 + remote rclone `crypt`), isi `BACKUP_REMOTE`, lalu hapus catatan ini.
> Sampai itu selesai, data hilang bersama mesin kalau disk rusak.


Backup yang hanya ada di mesin yang sama tidak melindungi dari disk rusak atau mesin hilang.
Isi `BACKUP_REMOTE` di `/opt/stacks/apps/sampaimana/backup.env` dengan remote rclone.

**Dump berisi email dan hash sandi pengguna, jadi enkripsi sebelum diunggah.** Gunakan remote `crypt`
di atas remote penyimpanan (Google Drive, Backblaze B2, Cloudflare R2, dst.):

```bash
rclone config                 # buat remote penyimpanan, mis. "gdrive" atau "b2"
rclone config                 # buat remote bertipe "crypt" mis. "sm-crypt" yang menunjuk ke gdrive:sampaimana
                              # simpan password + salt crypt di password manager (tanpa itu backup tidak bisa dibuka)
# di backup.env:
BACKUP_REMOTE=sm-crypt:
```

Token Google Drive bisa kedaluwarsa. Gejalanya: backup lokal sukses, status `offsite-failed`, notifikasi terkirim.
Perbaikan: `rclone config reconnect gdrive:`. Untuk B2/R2 tidak ada token kedaluwarsa (pakai application key).

### Notifikasi kegagalan

Isi `BACKUP_NOTIFY_URL` di `backup.env` dengan salah satu: URL topik **ntfy** (`https://ntfy.sh/<topik-rahasia>`),
webhook **Discord**, atau webhook **Slack**. Notifikasi terkirim saat:

- backup gagal total (systemd `OnFailure=` memanggil `backup.sh notify-fail`),
- backup lokal sukses tapi sinkron luar server gagal (`exit 3`, unit tampil *failed*).

Tanpa URL, pesan hanya masuk jurnal (`journalctl --user -u sampaimana-backup*`).
Catatan: tidak ada pemberitahuan kalau timer sama sekali tidak jalan (mis. mesin mati berhari-hari). Untuk itu pakai
monitor *heartbeat* eksternal (mis. healthchecks.io: tambahkan `curl` ke URL ping di akhir `backup.sh`).

### Uji restore (jalankan berkala, mis. sebulan sekali)

```bash
/opt/stacks/apps/sampaimana/backup.sh verify
# memeriksa checksum, memulihkan dump terbaru ke database sementara, menghitung baris, lalu menghapusnya
```

### Cara restore sungguhan

Hanya dilakukan bila data produksi rusak atau hilang. Ini **menimpa** database yang berjalan.

```bash
cd /opt/stacks/apps/sampaimana
B=/opt/stacks/backup/sampaimana/daily/<tanggal_jam>        # atau ambil dari remote: rclone copy sm-crypt:daily/<...> ./pulih
(cd "$B" && sha256sum -c SHA256SUMS)                       # pastikan berkas utuh

docker compose stop api web                                # hentikan penulisan
docker exec -i sampaimana-db pg_restore -U sampaimana -d sampaimana --clean --if-exists --no-owner < "$B/db.dump"
tar -C data -xzf "$B/uploads.tar.gz"                       # memulihkan data/uploads
docker compose start api web

curl -s https://sampaimana.hallojanu.me/api/health         # harus success
```

Mesin baru: pasang Docker, jalankan `deploy/deploy.sh` (membuat stack kosong), hentikan `api web`, lalu ikuti langkah restore di atas.
Rahasia (`JWT_SECRET`, `DB_PASSWORD`, kredensial admin) ada di `.env` stack dan **tidak** ikut backup; simpan terpisah di password manager.
Mengganti `JWT_SECRET` hanya memaksa semua pengguna login ulang.
