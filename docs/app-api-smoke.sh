#!/usr/bin/env bash
# Smoke test for the Run It Back Picks app API (/api/app/v1).
#
# Usage: BASE=https://<preview-or-prod-host> bash docs/app-api-smoke.sh
#
# It makes a throwaway player named "Smoke Test", reads the week, board,
# leagues and rivals, then deletes the account so it disappears from every
# board. It never makes a pick. Preview deployments behind Vercel login need a
# protection bypass token: add -H "x-vercel-protection-bypass: $BYPASS" below.
set -euo pipefail
BASE="${BASE:?set BASE to the site, like https://jaiyesobo.com}"
API="$BASE/api/app/v1"
H=(-sS -H "Content-Type: application/json")
[ -n "${BYPASS:-}" ] && H+=(-H "x-vercel-protection-bypass: $BYPASS")

step() { printf '\n== %s\n' "$1"; }

step "talk lines (public)"
curl "${H[@]}" "$API/talk/lines" | head -c 200; echo

step "signed out is refused"
curl "${H[@]}" -o /dev/null -w "%{http_code}\n" "$API/me"

step "join"
JOIN=$(curl "${H[@]}" -X POST "$API/session/join" -d '{"name":"Smoke Test","age_band":"13_plus"}')
echo "$JOIN" | head -c 300; echo
TOKEN=$(echo "$JOIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] || { echo "no token"; exit 1; }
A=("${H[@]}" -H "Authorization: Bearer $TOKEN")

for path in me week/current "board?span=week" "board?span=season" leagues rivals recap/current; do
  step "GET /$path"
  curl "${A[@]}" -w "\n[%{http_code}]\n" "$API/$path" | head -c 400; echo
done

step "create league without a pass is refused"
curl "${A[@]}" -X POST "$API/leagues" -d '{"name":"Smoke League"}' -w "\n[%{http_code}]\n"

step "bad league code"
curl "${A[@]}" -X POST "$API/leagues/join" -d '{"code":"NOPE-0000"}' -w "\n[%{http_code}]\n"

step "delete the smoke account"
curl "${A[@]}" -X DELETE "$API/me" -w "\n[%{http_code}]\n"

step "token no longer works"
curl "${A[@]}" -o /dev/null -w "%{http_code}\n" "$API/me"
