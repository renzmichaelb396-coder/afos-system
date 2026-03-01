#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
EMAIL="${EMAIL:-admin@example.com}"
PASSWORD="${PASSWORD:-admin123}"
YEAR="${YEAR:-2026}"
MONTH="${MONTH:-3}"
CLIENT_ID="${CLIENT_ID:-}"

rm -f cookies.txt

echo "[1] login"
curl -s -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$BASE/api/auth/login" | sed -n '1,25p'

echo "[2] billing status"
curl -s -b cookies.txt "$BASE/api/billing?year=$YEAR&month=$MONTH" | sed -n '1,200p'
echo

if [ -z "$CLIENT_ID" ]; then
  echo "[3] get client id"
  CLIENT_ID="$(curl -s -b cookies.txt "$BASE/api/clients" | node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write((x.clients?.[0]?.id)||"")')"
  if [ -z "$CLIENT_ID" ]; then
    echo "ERROR: No client id found from /api/clients"
    exit 1
  fi
  echo "CLIENT_ID=$CLIENT_ID"

  echo "CLIENT_ID=$CLIENT_ID"
fi

echo "[4] attempt payment (expect 409 if closed)"
curl -s -i -b cookies.txt -X POST "$BASE/api/payments" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"amount\":123,\"year\":$YEAR,\"month\":$MONTH}" | sed -n '1,80p'
