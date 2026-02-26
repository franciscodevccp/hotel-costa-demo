#!/bin/bash
# Sincroniza reservas desde MotoPress (WordPress) hacia MiHostal.
# Uso en el VPS: configurar SYNC_SECRET en .env y ejecutar cada 5 min con cron.
#
# crontab -e  →  */5 * * * * /var/www/hotel-costa-demo/scripts/sync-motopress.sh

set -e
LOG_FILE="${LOG_FILE:-/var/log/hotel-costa-sync.log}"
APP_URL="${APP_URL:-http://localhost:3000}"

# Cargar SYNC_SECRET desde .env del proyecto (ajustar ruta si hace falta)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$SYNC_SECRET" ]; then
  echo "$(date -Iseconds): SYNC_SECRET no configurado" >> "$LOG_FILE"
  exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $SYNC_SECRET" \
  "$APP_URL/api/sync/motopress")
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "$(date -Iseconds): HTTP $HTTP_CODE — $HTTP_BODY" >> "$LOG_FILE"

if [ "$HTTP_CODE" != "200" ]; then
  exit 1
fi
