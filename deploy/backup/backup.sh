#!/usr/bin/env bash
# Sampai Mana — backup harian: dump Postgres + folder uploads.
#
#   backup.sh              jalankan backup (dipanggil timer systemd tiap hari)
#   backup.sh verify       pulihkan dump terbaru ke database sementara dan hitung baris (uji restore)
#   backup.sh notify-fail  kirim notifikasi kegagalan (dipanggil systemd lewat OnFailure=)
#
# Pengaturan opsional ada di $ENV_FILE (lihat backup.env.example). Rahasia tidak pernah ditulis di sini.
# Dokumentasi lengkap dan cara restore: deploy/OPS.md
set -Eeuo pipefail

STACK=${STACK:-/opt/stacks/apps/sampaimana}
DEST=${DEST:-/opt/stacks/backup/sampaimana}
ENV_FILE=${ENV_FILE:-$STACK/backup.env}
DB_CONTAINER=${DB_CONTAINER:-sampaimana-db}
DB_USER=${DB_USER:-sampaimana}
DB_NAME=${DB_NAME:-sampaimana}
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

REMOTE=${BACKUP_REMOTE:-}           # contoh: gdrive-crypt:sampaimana  (kosong = hanya salinan lokal)
NOTIFY_URL=${BACKUP_NOTIFY_URL:-}   # ntfy / Discord / Slack webhook (kosong = hanya tulis ke jurnal)
KEEP_DAILY=${KEEP_DAILY:-7}
KEEP_WEEKLY=${KEEP_WEEKLY:-4}
STATUS="$DEST/last-status.json"

log() { echo "[$(date -Is)] $*"; }

notify() { # notify <judul> <isi>
  local title=$1 body=$2
  log "NOTIFY: $title — $body"
  [ -n "$NOTIFY_URL" ] || return 0
  case "$NOTIFY_URL" in
    *discord.com/api/webhooks/*)
      curl -fsS -m 15 -H 'Content-Type: application/json' \
        -d "$(python3 -c 'import json,sys;print(json.dumps({"content":"**%s**\n%s"%(sys.argv[1],sys.argv[2])}))' "$title" "$body")" "$NOTIFY_URL" >/dev/null ;;
    *hooks.slack.com/*)
      curl -fsS -m 15 -H 'Content-Type: application/json' \
        -d "$(python3 -c 'import json,sys;print(json.dumps({"text":"*%s*\n%s"%(sys.argv[1],sys.argv[2])}))' "$title" "$body")" "$NOTIFY_URL" >/dev/null ;;
    *) # ntfy (ntfy.sh atau self-hosted)
      curl -fsS -m 15 -H "Title: $title" -H 'Priority: high' -H 'Tags: warning' -d "$body" "$NOTIFY_URL" >/dev/null ;;
  esac || log "peringatan: notifikasi gagal terkirim"
}

write_status() { # write_status <ok|failed|offsite-failed> <pesan>
  mkdir -p "$DEST"
  python3 - "$1" "$2" >"$STATUS" <<'PY'
import json, sys, datetime
print(json.dumps({"state": sys.argv[1], "message": sys.argv[2], "at": datetime.datetime.now().astimezone().isoformat()}))
PY
}

case "${1:-run}" in
notify-fail)
  msg=$(python3 -c 'import json;print(json.load(open("'"$STATUS"'")).get("message",""))' 2>/dev/null || true)
  notify "Backup Sampai Mana GAGAL" "${msg:-backup berhenti dengan error, lihat: journalctl --user -u sampaimana-backup.service}"
  exit 0 ;;

verify)
  latest=$(find "$DEST/daily" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)
  [ -n "$latest" ] || { echo "belum ada backup di $DEST/daily" >&2; exit 1; }
  (cd "$latest" && sha256sum -c SHA256SUMS)
  scratch=restore_check_$$
  docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$scratch"
  trap 'docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$scratch" >/dev/null' EXIT
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$scratch" --no-owner <"$latest/db.dump"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$scratch" -tAc \
    "select 'cases='||(select count(*) from cases)||' users='||(select count(*) from users)||' stages='||(select count(*) from case_stages)"
  echo "restore OK dari $latest" ; exit 0 ;;
esac

# --- backup ---------------------------------------------------------------
mkdir -p "$DEST"
exec 9>"$(dirname "$DEST")/.sampaimana-backup.lock"
flock -n 9 || { log "backup lain masih berjalan, lewati"; exit 0; }

mkdir -p "$DEST/daily" "$DEST/weekly"
trap 'rc=$?; [ -n "${DIR:-}" ] && rm -rf "$DIR"; write_status failed "baris $LINENO: ${BASH_COMMAND} (exit $rc)"; exit $rc' ERR

STAMP=$(date +%Y-%m-%d_%H%M)
DIR="$DEST/daily/$STAMP"
mkdir -p "$DIR"

log "dump database"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner >"$DIR/db.dump"
docker exec -i "$DB_CONTAINER" pg_restore --list <"$DIR/db.dump" >/dev/null   # arsip harus terbaca
log "db.dump $(du -h "$DIR/db.dump" | cut -f1)"

log "arsipkan uploads"
tar -C "$STACK/data" -czf "$DIR/uploads.tar.gz" uploads
(cd "$DIR" && sha256sum db.dump uploads.tar.gz >SHA256SUMS)

[ "$(date +%u)" = 7 ] && cp -a "$DIR" "$DEST/weekly/$STAMP"

prune() { find "$1" -mindepth 1 -maxdepth 1 -type d | sort | head -n -"$2" | xargs -r rm -rf; }
log "rotasi (simpan $KEEP_DAILY harian, $KEEP_WEEKLY mingguan)"
prune "$DEST/daily" "$KEEP_DAILY"
prune "$DEST/weekly" "$KEEP_WEEKLY"

if [ -n "$REMOTE" ]; then
  log "sinkron ke $REMOTE"
  if ! rclone sync "$DEST" "$REMOTE" --transfers 2 --exclude 'last-status.json' --quiet; then
    write_status offsite-failed "salinan lokal OK ($STAMP) tapi sinkron ke $REMOTE gagal (cek: rclone config reconnect ${REMOTE%%:*}:)"
    notify "Backup Sampai Mana: salinan luar server GAGAL" "Backup lokal $STAMP aman, tapi rclone ke $REMOTE gagal. Biasanya token kedaluwarsa: rclone config reconnect ${REMOTE%%:*}:"
    exit 3
  fi
else
  log "BACKUP_REMOTE kosong: hanya salinan lokal (belum ada salinan di luar server)"
fi

write_status ok "backup $STAMP selesai$([ -n "$REMOTE" ] && echo ", tersalin ke $REMOTE")"
log "selesai: $DIR"
