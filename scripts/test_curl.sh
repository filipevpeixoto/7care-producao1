#!/bin/bash

BASE_URL="https://7careadv.netlify.app"
EMAIL="pastor.test.$(date +%s)@7care.com"

echo "=== 1. LOGIN ==="
LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@7care.com","password":"meu7care"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "=== 2. CRIAR CONVITE ==="
echo "Email: $EMAIL"
INVITE=$(curl -s -X POST "${BASE_URL}/api/invites" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"email\":\"$EMAIL\",\"expiresInDays\":7}")
echo "Resposta: $INVITE"

INVITE_TOKEN=$(echo "$INVITE" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "Token convite: ${INVITE_TOKEN:0:40}..."

echo ""
echo "=== 3. SUBMETER ONBOARDING ==="
PAYLOAD=$(cat <<EOF
{
  "name": "Pastor Teste Curl",
  "phone": "11999999999",
  "password": "teste123",
  "district": {"name": "Distrito Teste Curl"},
  "churches": [{"name": "Igreja Teste Curl", "address": "Rua Teste 123"}]
}
EOF
)
echo "Payload: $PAYLOAD"

RESULT=$(curl -s -X POST "${BASE_URL}/api/invites/onboarding/${INVITE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
echo ""
echo "Resultado: $RESULT"
