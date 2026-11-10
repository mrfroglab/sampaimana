#!/usr/bin/env bash
# Pasang backup harian sebagai systemd *user* timer. Idempoten; aman dijalankan ulang.
# Butuh: docker, python3, rclone (opsional, untuk salinan luar server), `loginctl enable-linger $USER`.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
STACK=${STACK:-/opt/stacks/apps/sampaimana}
UNITS="$HOME/.config/systemd/user"

install -m 750 "$HERE/backup.sh" "$STACK/backup.sh"
[ -f "$STACK/backup.env" ] || { install -m 600 "$HERE/backup.env.example" "$STACK/backup.env"; echo "dibuat $STACK/backup.env (isi BACKUP_REMOTE dan BACKUP_NOTIFY_URL)"; }

mkdir -p "$UNITS"
cat >"$UNITS/sampaimana-backup.service" <<EOF
[Unit]
Description=Sampai Mana daily backup (Postgres + uploads)
After=docker.service network-online.target
OnFailure=sampaimana-backup-notify.service

[Service]
Type=oneshot
ExecStart=$STACK/backup.sh
EOF
cat >"$UNITS/sampaimana-backup-notify.service" <<EOF
[Unit]
Description=Notify that the Sampai Mana backup failed

[Service]
Type=oneshot
ExecStart=$STACK/backup.sh notify-fail
EOF
cat >"$UNITS/sampaimana-backup.timer" <<'EOF'
[Unit]
Description=Run Sampai Mana backup daily at 02:30

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=5m

[Install]
WantedBy=timers.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now sampaimana-backup.timer
systemctl --user list-timers sampaimana-backup.timer --no-pager
