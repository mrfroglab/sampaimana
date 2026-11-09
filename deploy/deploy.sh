#!/usr/bin/env bash
# Deploy Sampai Mana ke server ini: /opt/stacks/apps/sampaimana (Docker + Caddy, jaringan gateway-net).
# Idempotent: aman dijalankan ulang untuk update. Tidak pernah mencetak rahasia.
#
# Opsi lewat environment:
#   SITE_URL         URL publik (default https://sampaimana.hallojanu.me)
#   API_SRC          folder repo API (default: dicari otomatis di sebelah repo web)
#   ADMIN_EMAIL      email super admin pertama (dipakai hanya bila belum ada super admin)
#   SEED_DEMO=true   isi 5 kasus contoh bila tabel kasus masih kosong
set -euo pipefail

WEB_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK=/opt/stacks/apps/sampaimana
CADDYFILE=/opt/stacks/reverse-proxy/Caddyfile
SITE_URL="${SITE_URL:-https://sampaimana.hallojanu.me}"
HOST="${SITE_URL#*://}"

if [ -z "${API_SRC:-}" ]; then
  for c in "$WEB_SRC/../sampaimana-api" "$WEB_SRC/../../sampaimana-api/upgrade" "$WEB_SRC/../../sampaimana-api/main"; do
    if [ -f "$c/prisma/schema.prisma" ]; then API_SRC="$(cd "$c" && pwd)"; break; fi
  done
fi
[ -f "${API_SRC:-}/prisma/schema.prisma" ] || { echo "Repo API tidak ditemukan. Set API_SRC=/path/ke/sampaimana-api" >&2; exit 1; }

mkdir -p "$STACK/data/uploads" "$STACK/data/postgres"
# Container API berjalan sebagai user "node" (uid 1000).
chown 1000:1000 "$STACK/data/uploads" 2>/dev/null || true

# --- .env: rahasia dibuat sekali, disimpan di server (izin 600) ---
touch "$STACK/.env"; chmod 600 "$STACK/.env"
rand() { head -c 96 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
ensure_secret() { grep -q "^$1=." "$STACK/.env" || printf '%s=%s\n' "$1" "$(rand "$2")" >> "$STACK/.env"; }
ensure_default() { grep -q "^$1=" "$STACK/.env" || printf '%s=%s\n' "$1" "$2" >> "$STACK/.env"; }
ensure_secret DB_PASSWORD 32
ensure_secret JWT_SECRET 64
ensure_default SMTP_URL ""
ensure_default MAIL_FROM "Sampai Mana <no-reply@hallojanu.me>"
ensure_default SEED_ADMIN_NAME "Redaksi"
NEW_ADMIN_PASSWORD=""
if [ -n "${ADMIN_EMAIL:-}" ] && ! grep -q "^SEED_ADMIN_EMAIL=." "$STACK/.env"; then
  NEW_ADMIN_PASSWORD="$(rand 20)"
  printf 'SEED_ADMIN_EMAIL=%s\nSEED_ADMIN_PASSWORD=%s\n' "$ADMIN_EMAIL" "$NEW_ADMIN_PASSWORD" >> "$STACK/.env"
fi
( umask 077; grep -vE '^(SITE_URL|SEED_DEMO)=' "$STACK/.env" > "$STACK/.env.tmp" || true
  printf 'SITE_URL=%s\nSEED_DEMO=%s\n' "$SITE_URL" "${SEED_DEMO:-false}" >> "$STACK/.env.tmp" )
mv "$STACK/.env.tmp" "$STACK/.env"; chmod 600 "$STACK/.env"

cp "$WEB_SRC/deploy/docker-compose.yml" "$STACK/docker-compose.yml"

echo "› Build image API ($API_SRC)"
docker build -q -t sampaimana-api:local "$API_SRC" >/dev/null
echo "› Build image web ($WEB_SRC)"
docker build -q --build-arg "VITE_SITE_URL=$SITE_URL" -t sampaimana-web:local "$WEB_SRC" >/dev/null

cd "$STACK"
docker compose up -d --remove-orphans

# --- Rute Caddy: blok dikelola skrip ini, diedit di tempat agar inode Caddyfile tetap ---
cp "$CADDYFILE" "$CADDYFILE.bak"
SITE_HOST="$HOST" python3 - "$CADDYFILE" <<'PY'
import os, re, sys
path, host = sys.argv[1], os.environ["SITE_HOST"]
block = f"""# BEGIN sampaimana (dikelola deploy/deploy.sh)
http://{host} {{
	encode zstd gzip
	# IP asli pengunjung dari Cloudflare, dipakai rate limit API.
	@api path /api/*
	handle @api {{
		reverse_proxy sampaimana-api:5000 {{
			header_up X-Forwarded-For {{http.request.header.CF-Connecting-IP}}
		}}
	}}
	handle {{
		reverse_proxy sampaimana-web:3000 {{
			header_up X-Forwarded-For {{http.request.header.CF-Connecting-IP}}
		}}
	}}
}}
# END sampaimana"""
src = open(path).read()
pattern = re.compile(r"# BEGIN sampaimana.*?# END sampaimana", re.S)
src = pattern.sub(block, src) if pattern.search(src) else src.rstrip() + "\n\n" + block + "\n"
with open(path, "r+") as f:
    f.seek(0); f.write(src); f.truncate()
PY
if ! docker exec caddy-proxy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  echo "Caddyfile tidak valid, mengembalikan cadangan." >&2
  cat "$CADDYFILE.bak" > "$CADDYFILE"; exit 1
fi
docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1

echo "› Menunggu layanan sehat…"
for _ in $(seq 1 60); do
  s="$(docker inspect -f '{{.State.Health.Status}}' sampaimana-web 2>/dev/null || true)"
  [ "$s" = healthy ] && break; sleep 2
done
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
echo "Selesai: $SITE_URL"
if [ -n "$NEW_ADMIN_PASSWORD" ]; then
  echo "Super admin dibuat untuk $ADMIN_EMAIL. Kata sandi awal tersimpan di $STACK/.env (SEED_ADMIN_PASSWORD); segera ganti setelah masuk."
fi
