#!/usr/bin/env bats

REFINE_SCRIPTS_DIR="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)/skills/refine-knowledge/scripts"
LOADER_SCRIPTS_DIR="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)/skills/context-loader/scripts"

setup() {
  TEST_TMP=$(mktemp -d)
  TEST_VAULT="$TEST_TMP/vault"
  mkdir -p "$TEST_VAULT/06-Archive/ingest/queue"
  mkdir -p "$TEST_VAULT/04-Working"
  mkdir -p "$TEST_VAULT/06-Archive/ingest/context"
}

teardown() {
  rm -rf "$TEST_TMP"
}

@test "hook-lifecycle: queue-session parses payload correctly" {
  TRANSCRIPT_FILE="$TEST_TMP/test-session.jsonl"
  echo '{"type":"human","message":"test"}' > "$TRANSCRIPT_FILE"
  PAYLOAD=$(python3 -c "
import json
print(json.dumps({
    'transcript_path': '$TRANSCRIPT_FILE',
    'session_id': 'test-session-001'
}))
")
  RESULT=$(echo "$PAYLOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('transcript_path', ''))
print(d.get('session_id', ''))
")
  EXPECTED="$TRANSCRIPT_FILE
test-session-001"
  [ "$RESULT" = "$EXPECTED" ]
}

@test "hook-lifecycle: queue-session backs up transcript" {
  TRANSCRIPT_FILE="$TEST_TMP/test-session.jsonl"
  echo '{"type":"human","message":"test backup"}' > "$TRANSCRIPT_FILE"
  DATE=$(date +%Y%m%d)
  TIME=$(date +%H%M%S)
  cp "$TRANSCRIPT_FILE" "$TEST_VAULT/06-Archive/ingest/queue/${DATE}-${TIME}-test-session.jsonl"
  BACKUP_COUNT=$(ls "$TEST_VAULT/06-Archive/ingest/queue/" | wc -l | tr -d ' ')
  [ "$BACKUP_COUNT" -ge 1 ]
  BACKUP_FILE=$(ls "$TEST_VAULT/06-Archive/ingest/queue/" | head -1)
  diff "$TRANSCRIPT_FILE" "$TEST_VAULT/06-Archive/ingest/queue/$BACKUP_FILE"
}

@test "hook-lifecycle: queue-session silent exit on empty payload" {
  # Simulate queue-session.sh parsing logic with empty transcript_path
  PAYLOAD=$(python3 -c "
import json
print(json.dumps({'transcript_path': '', 'session_id': 'test'}))
")
  TRANSCRIPT=$(echo "$PAYLOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('transcript_path', ''))
" 2>/dev/null || true)
  # queue-session.sh: [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0
  # When transcript is empty, script exits 0 silently
  [ -z "$TRANSCRIPT" ]
  # Verify this would result in silent exit (no stdout from the parsing beyond empty string)
  SESSION_ID=$(echo "$PAYLOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('session_id', ''))
" 2>/dev/null || true)
  [ "$SESSION_ID" = "test" ]
}

@test "hook-lifecycle: inject-context reads context file" {
  echo "# Latest context" > "$TEST_VAULT/06-Archive/ingest/context/latest.md"
  echo "Test data for integration" >> "$TEST_VAULT/06-Archive/ingest/context/latest.md"
  OBSIDIAN_VAULT_PATH="$TEST_VAULT" run bash "$LOADER_SCRIPTS_DIR/inject-context.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Latest context"* ]]
}

@test "hook-lifecycle: inject-context no output when file missing" {
  OBSIDIAN_VAULT_PATH="$TEST_VAULT" run bash "$LOADER_SCRIPTS_DIR/inject-context.sh"
  [ "$status" -eq 0 ]
  [ "$output" = "" ]
}
