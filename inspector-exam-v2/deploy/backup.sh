#!/usr/bin/env bash
# BRILL TEAM PROJECT — encrypted local backup of Electra Afikim examination database.
set -euo pipefail
umask 077
OUT=/var/backups/afikim-exam
KEY=/etc/afikim-exam/backup.pass
CONTAINER=afikim-exam-postgres
DATABASE=afikim_exam
USER=afikim_exam
test -r "$KEY" || { echo 'Backup encryption key missing' >&2; exit 1; }
install -d -m 0700 "$OUT"
NAME="$OUT/exam-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
TEMP="$NAME.partial"
trap 'rm -f "$TEMP"' EXIT
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DATABASE" -Fc | gpg --batch --yes --pinentry-mode loopback --passphrase-file "$KEY" --cipher-algo AES256 --compress-algo none --symmetric --output "$TEMP"
test -s "$TEMP"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$KEY" --decrypt "$TEMP" 2>/dev/null | docker exec -i "$CONTAINER" pg_restore -l >/dev/null
mv -f "$TEMP" "$NAME"
chmod 600 "$NAME"
find "$OUT" -maxdepth 1 -name 'exam-*.dump.gpg' -type f -mtime +21 -delete
echo "Encrypted Afikim PostgreSQL backup verified: $NAME"
