#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
UNKEY_URL="${UNKEY_SERVER_URL:-http://localhost:8080}"
ROOT_KEY="${UNKEY_ROOT_KEY:?UNKEY_ROOT_KEY is required}"
API_ID="${UNKEY_API_ID:?UNKEY_API_ID is required}"

# ── colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; exit 1; }
step() { echo -e "\n${CYAN}── $* ──${NC}"; }

# ── helpers ──────────────────────────────────────────────────────────────────
get_field() { echo "$1" | grep -o "\"$2\":[^,}]*" | sed "s/\"$2\"://;s/\"//g;s/ //g"; }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  [ "$actual" = "$expected" ] && ok "$label (HTTP $actual)" || fail "$label — expected $expected, got $actual"
}

# ── Step 1: create identities ─────────────────────────────────────────────────
step "Creating identities"

ALICE_RESP=$(curl -sf -X POST "$UNKEY_URL/v2/identities.createIdentity" \
  -H "Authorization: Bearer $ROOT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"alice-test"}')
ok "Identity alice-test created"

BOB_RESP=$(curl -sf -X POST "$UNKEY_URL/v2/identities.createIdentity" \
  -H "Authorization: Bearer $ROOT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"bob-test"}')
ok "Identity bob-test created"

# ── Step 2: issue keys ────────────────────────────────────────────────────────
step "Issuing API keys"

ALICE_KEY_RESP=$(curl -sf -X POST "$UNKEY_URL/v2/keys.createKey" \
  -H "Authorization: Bearer $ROOT_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"apiId\":\"$API_ID\",\"externalId\":\"alice-test\",\"prefix\":\"quiz\"}")
ALICE_KEY=$(get_field "$ALICE_KEY_RESP" "key")
ok "Alice key: $ALICE_KEY"

BOB_KEY_RESP=$(curl -sf -X POST "$UNKEY_URL/v2/keys.createKey" \
  -H "Authorization: Bearer $ROOT_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"apiId\":\"$API_ID\",\"externalId\":\"bob-test\",\"prefix\":\"quiz\"}")
BOB_KEY=$(get_field "$BOB_KEY_RESP" "key")
ok "Bob key: $BOB_KEY"

# ── Step 3: create a question as Alice ───────────────────────────────────────
step "Creating question (Alice)"

STATUS=$(curl -s -o /tmp/q_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/question" \
  -H "x-api-key: $ALICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the capital of France?",
    "type": "multiple_choice",
    "topic": "Geography",
    "options": ["Berlin","Madrid","Paris","Rome"],
    "correctAnswer": "Paris",
    "explanation": ["Paris has been the capital of France since 987 AD."]
  }')
assert_status "Create question" 201 "$STATUS"
Q_ID=$(get_field "$(cat /tmp/q_resp.json)" "id")
ok "Question ID: $Q_ID"

# ── Step 4: Alice can read her own question ───────────────────────────────────
step "Ownership checks"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/question/$Q_ID" \
  -H "x-api-key: $ALICE_KEY")
assert_status "Alice reads own question" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/question/$Q_ID" \
  -H "x-api-key: $BOB_KEY")
assert_status "Bob blocked from Alice's question" 403 "$STATUS"

# ── Step 5: no key → 401 ─────────────────────────────────────────────────────
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/question/$Q_ID")
assert_status "No key returns 401" 401 "$STATUS"

# ── Step 6: search scoped to owner ───────────────────────────────────────────
step "Search (Alice)"

STATUS=$(curl -s -o /tmp/search_resp.json -w "%{http_code}" \
  "$BASE_URL/api/question/search/capital%20of%20France/5" \
  -H "x-api-key: $ALICE_KEY")
assert_status "Search returns 200" 200 "$STATUS"
echo "  Results: $(cat /tmp/search_resp.json)"

# ── Step 7: Bob cannot create quiz with Alice's question ──────────────────────
step "Quiz ownership enforcement"

STATUS=$(curl -s -o /tmp/quiz_forbidden.json -w "%{http_code}" -X POST "$BASE_URL/api/quiz" \
  -H "x-api-key: $BOB_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bob's Quiz\",\"questionIds\":[\"$Q_ID\"]}")
assert_status "Bob cannot use Alice's question in quiz" 403 "$STATUS"

# ── Step 8: Alice creates a quiz ──────────────────────────────────────────────
STATUS=$(curl -s -o /tmp/quiz_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/quiz" \
  -H "x-api-key: $ALICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Alice's Quiz\",\"questionIds\":[\"$Q_ID\"]}")
assert_status "Alice creates quiz" 201 "$STATUS"
QUIZ_ID=$(get_field "$(cat /tmp/quiz_resp.json)" "id")
ok "Quiz ID: $QUIZ_ID"

# ── Step 9: quiz is publicly accessible ──────────────────────────────────────
step "Public access"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/quiz/$QUIZ_ID")
assert_status "Quiz readable without key" 200 "$STATUS"

STATUS=$(curl -s -o /tmp/attempt_resp.json -w "%{http_code}" -X POST \
  "$BASE_URL/api/question/$Q_ID/attempt" \
  -H "Content-Type: application/json" \
  -d '{"answer":"Paris"}')
assert_status "Attempt (public) correct answer" 200 "$STATUS"
echo "  $(cat /tmp/attempt_resp.json)"

echo -e "\n${GREEN}All tests passed.${NC}"
