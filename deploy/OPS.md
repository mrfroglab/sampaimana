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
Notifikasi di atas hanya terkirim kalau skrip sempat berjalan. Kalau timer sama sekali tidak jalan (mesin mati berhari-hari),
pakai **heartbeat**: daftarkan satu check di healthchecks.io (jadwal harian, grace sekitar 6 jam) dan isi `BACKUP_HEARTBEAT_URL`
di `backup.env`. Ping hanya dikirim setelah backup lengkap berhasil (termasuk salinan luar server bila `BACKUP_REMOTE` diisi),
jadi gagal, terlewat, atau timer mati sama-sama berujung pada ping yang tidak datang, dan layanan itu yang mengirim alarm.

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
**Jangan mengganti `JWT_SECRET` sembarangan.** Selain memaksa semua pengguna login ulang, kunci enkripsi rahasia 2FA diturunkan
dari `JWT_SECRET` (`src/lib/totp.js` di repo API). Mengganti nilainya membuat verifikasi dua langkah semua pengguna tidak bisa
dipakai, dan 2FA mereka harus di-reset (lihat runbook di bawah). Saat pindah mesin, pakai `JWT_SECRET` yang sama.

## Konfigurasi yang belum lengkap

Per 2026-11-11. Hapus baris yang sudah selesai.

| Hal | Dampak selama belum diisi | Cara mengisi |
| --- | --- | --- |
| `SMTP_URL` kosong | Email notifikasi, ringkasan redaksi via email, dan balasan otomatis tidak terkirim. Notifikasi di aplikasi tetap jalan. | Isi `SMTP_URL` dan `MAIL_FROM` di `.env` stack, lalu `docker compose up -d api` |
| `BACKUP_REMOTE` kosong | Backup hanya ada di mesin yang sama | Lihat [Salinan di luar server](#salinan-di-luar-server-wajib-untuk-benar-benar-aman) |
| `BACKUP_NOTIFY_URL` / `BACKUP_HEARTBEAT_URL` kosong | Kegagalan backup hanya tercatat di jurnal | Lihat [Notifikasi kegagalan](#notifikasi-kegagalan) |
| Turnstile, `REGISTRATION_OPEN`, `LOGIN_*` | Tidak bisa diubah dari `.env`, karena `docker-compose.yml` belum meneruskan env ini ke container API. Nilai default berlaku: pendaftaran terbuka, tanpa Turnstile. | Tambahkan ke blok `environment` service `api` di `deploy/docker-compose.yml` (mis. `REGISTRATION_OPEN: ${REGISTRATION_OPEN:-true}`), jalankan `deploy/deploy.sh`, lalu isi di `.env` |
| Cloudflare Access untuk `/redaksi` | Meja redaksi hanya dilindungi login + 2FA | Atur di dasbor Cloudflare Zero Trust |

## Runbook insiden

Selalu mulai dari sini:

```bash
cd /opt/stacks/apps/sampaimana
docker compose ps                                   # semua harus "healthy"
curl -s https://sampaimana.hallojanu.me/api/health  # harus success
docker logs --tail 100 sampaimana-api
docker logs --tail 100 sampaimana-web
```

### Situs tidak bisa dibuka

1. `docker compose ps`. Bila ada container yang mati: `docker compose up -d`, lalu periksa log container itu.
2. Semua container sehat tapi situs tetap tidak terbuka: periksa Caddy (`docker logs --tail 50 caddy-proxy`) dan tunnel Cloudflare.
3. API gagal start dengan pesan `Konfigurasi environment tidak valid`: ada env yang salah di `.env` stack. Pesannya menyebut env
   yang bermasalah.
4. API gagal start saat migrasi: lihat [Migrasi gagal](#migrasi-gagal).

### Deploy dari CI gagal

Job `deploy` mengecek health setelah container diganti. Kalau gagal, container baru tetap berjalan dalam keadaan tidak sehat.

1. Buka log job di tab *Actions* GitHub, lalu `docker logs sampaimana-api` (atau `-web`) di server.
2. Kalau penyebabnya tidak cepat ketemu, **rollback** (di bawah), lalu perbaiki lewat PR baru.

### Rollback ke versi sebelumnya

Cara utama, yang meninggalkan jejak dan tidak butuh akses ke server:

```bash
git revert <sha-commit-bermasalah>   # di repo yang bermasalah
git push origin main                 # CI membangun dan men-deploy versi hasil revert
```

Cara darurat, bila CI juga bermasalah. Setiap build punya tag `sha-<7 karakter>` di GHCR. Docker di host **tidak** login ke GHCR,
jadi login dulu dengan token GitHub ber-*scope* `read:packages`:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <user-github> --password-stdin
docker pull ghcr.io/mrfroglab/api-sampaimana:sha-<sha>
docker tag  ghcr.io/mrfroglab/api-sampaimana:sha-<sha> ghcr.io/mrfroglab/api-sampaimana:latest
docker compose up -d --no-deps api
docker logout ghcr.io
```

Rollback API yang melewati sebuah migrasi **tidak** membatalkan migrasinya. Migrasi di repo ini dibuat aditif, jadi versi lama
biasanya tetap jalan. Bila tidak, pulihkan dari backup.

### Migrasi gagal

Container API menjalankan `prisma migrate deploy` saat start. Bila gagal, API tidak start dan log-nya menyebut migrasi yang gagal.

1. **Jangan** menjalankan `prisma migrate reset` di produksi.
2. Perbaiki migrasinya lewat PR (migrasi baru, bukan mengedit migrasi yang sudah ter-*deploy*).
3. Bila migrasi gagal setengah jalan dan Prisma menandainya *failed*, setelah memastikan keadaan skema:
   `docker compose run --rm --entrypoint node_modules/.bin/prisma api migrate resolve --rolled-back <nama_migrasi>`, lalu deploy
   ulang. `--entrypoint` diperlukan karena entrypoint biasa langsung menjalankan `migrate deploy` lagi.
4. Bila data rusak: [restore dari backup](#cara-restore-sungguhan).

### Admin terkunci atau kehilangan 2FA

- Ada SUPER_ADMIN lain: buka `/redaksi/pengguna`, lalu pilih **buka kunci** atau **reset 2FA** pada akun itu.
- Satu-satunya SUPER_ADMIN terkunci: tunggu `LOGIN_LOCK_MINUTES` (default 15 menit), atau buka kunci lewat database:
  ```bash
  docker exec -it sampaimana-db psql -U sampaimana -d sampaimana -c \
    "UPDATE users SET \"failedLogins\"=0, \"lockedUntil\"=NULL WHERE email='<email>';"
  ```
- Satu-satunya SUPER_ADMIN kehilangan perangkat 2FA dan kode pemulihan:
  ```bash
  docker exec -it sampaimana-db psql -U sampaimana -d sampaimana -c \
    "UPDATE users SET \"totpSecret\"=NULL, \"totpEnabledAt\"=NULL, \"totpLastStep\"=NULL, \"recoveryCodes\"='{}' WHERE email='<email>';"
  ```
  Setelah masuk, aktifkan 2FA lagi dan simpan kode pemulihan baru di password manager.

### Dugaan kebocoran data atau akun dibobol

1. Cabut akses: blokir akun yang dicurigai di `/redaksi/pengguna`. Pengguna yang diblokir langsung kehilangan akses.
2. Bila `JWT_SECRET` atau `.env` bocor: ganti `JWT_SECRET` (semua sesi putus, dan 2FA semua pengguna perlu di-reset, lihat di
   atas), ganti `DB_PASSWORD`, lalu `docker compose up -d`.
3. Simpan bukti: `activity_logs` (log audit, termasuk IP), log container, dan log Cloudflare.
4. UU PDP mewajibkan pemberitahuan tertulis kepada pengguna terdampak dan otoritas paling lambat **3×24 jam** setelah kebocoran
   diketahui. Lihat [Kebijakan Privasi](../docs/legal/PRIVACY.md#5-keamanan).
