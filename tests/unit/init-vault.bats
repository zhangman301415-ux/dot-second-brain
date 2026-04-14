#!/usr/bin/env bats

SCRIPTS_DIR="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)/skills/scripts"

setup() {
  TEST_TMP=$(mktemp -d)
}

teardown() {
  rm -rf "$TEST_TMP"
}

@test "init-vault: exit 1 with no args" {
  run bash "$SCRIPTS_DIR/init-vault.sh"
  [ "$status" -eq 1 ]
}

@test "init-vault: exit 1 with relative path" {
  run bash "$SCRIPTS_DIR/init-vault.sh" "relative/path"
  [ "$status" -eq 1 ]
}

@test "init-vault: creates all directory structure" {
  TEST_VAULT="$TEST_TMP/vault"
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT"
  [ "$status" -eq 0 ]
  [ -d "$TEST_VAULT/00-Identity/capabilities" ]
  [ -d "$TEST_VAULT/00-Identity/narrative" ]
  [ -d "$TEST_VAULT/00-Identity/preferences" ]
  [ -d "$TEST_VAULT/00-Identity/relationships" ]
  [ -d "$TEST_VAULT/00-Identity/values" ]
  [ -d "$TEST_VAULT/01-Procedural" ]
  [ -d "$TEST_VAULT/02-Semantic/Areas" ]
  [ -d "$TEST_VAULT/02-Semantic/Resources" ]
  [ -d "$TEST_VAULT/03-Episodic" ]
  [ -d "$TEST_VAULT/04-Working" ]
  [ -d "$TEST_VAULT/05-Creation" ]
  [ -d "$TEST_VAULT/06-Archive/ingest/queue" ]
  [ -d "$TEST_VAULT/06-Archive/ingest/context" ]
}

@test "init-vault: generates all template files on first run" {
  TEST_VAULT="$TEST_TMP/vault"
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT"
  [ "$status" -eq 0 ]
  [ -f "$TEST_VAULT/00-Identity/profile.md" ]
  [ -f "$TEST_VAULT/00-Identity/values/core-values.md" ]
  [ -f "$TEST_VAULT/00-Identity/capabilities/current-skills.md" ]
  [ -f "$TEST_VAULT/00-Identity/capabilities/growth-trajectory.md" ]
  [ -f "$TEST_VAULT/00-Identity/preferences/work-style.md" ]
  [ -f "$TEST_VAULT/00-Identity/relationships/communities.md" ]
  [ -f "$TEST_VAULT/00-Identity/narrative/turning-points.md" ]
}

@test "init-vault: generates all index files" {
  TEST_VAULT="$TEST_TMP/vault"
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT"
  [ "$status" -eq 0 ]
  [ -f "$TEST_VAULT/03-Episodic/index.md" ]
  [ -f "$TEST_VAULT/01-Procedural/index.md" ]
  [ -f "$TEST_VAULT/02-Semantic/index.md" ]
  [ -f "$TEST_VAULT/04-Working/active.md" ]
}

@test "init-vault: template files contain correct frontmatter" {
  TEST_VAULT="$TEST_TMP/vault"
  bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT"
  grep -q "^---" "$TEST_VAULT/00-Identity/profile.md"
  grep -q "type: profile" "$TEST_VAULT/00-Identity/profile.md"
  grep -q "^---" "$TEST_VAULT/03-Episodic/index.md"
  grep -q "type: episodic" "$TEST_VAULT/03-Episodic/index.md"
  grep -q "^---" "$TEST_VAULT/01-Procedural/index.md"
  grep -q "type: procedural" "$TEST_VAULT/01-Procedural/index.md"
  grep -q "^---" "$TEST_VAULT/04-Working/active.md"
  grep -q "type: working" "$TEST_VAULT/04-Working/active.md"
}

@test "init-vault: second run does not overwrite existing files (idempotent)" {
  TEST_VAULT="$TEST_TMP/vault"
  CONFIG_FILE="$TEST_TMP/config.json"
  bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT" "$CONFIG_FILE"
  MTIME_1=$(stat -f "%m" "$TEST_VAULT/00-Identity/profile.md")
  sleep 1
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT" "$CONFIG_FILE"
  [ "$status" -eq 0 ]
  MTIME_2=$(stat -f "%m" "$TEST_VAULT/00-Identity/profile.md")
  [ "$MTIME_1" -eq "$MTIME_2" ]
}

@test "init-vault: config written to vault-config.json" {
  TEST_VAULT="$TEST_TMP/vault"
  CONFIG_FILE="$TEST_TMP/config.json"
  bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT" "$CONFIG_FILE"
  VAULT_PATH=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['vaultPath'])")
  [ "$VAULT_PATH" = "$TEST_VAULT" ]
  INITIALIZED=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['initialized'])")
  [ "$INITIALIZED" = "True" ]
}

@test "init-vault: custom config path parameter" {
  TEST_VAULT="$TEST_TMP/vault"
  CUSTOM_CONFIG="$TEST_TMP/custom/path/config.json"
  mkdir -p "$TEST_TMP/custom/path"
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_VAULT" "$CUSTOM_CONFIG"
  [ "$status" -eq 0 ]
  [ -f "$CUSTOM_CONFIG" ]
}

@test "init-vault: exit 2 when mkdir fails" {
  TEST_VAULT="$TEST_TMP/vault"
  # Create a file where a directory needs to be, so mkdir will fail
  mkdir -p "$TEST_TMP"
  touch "$TEST_TMP/vault"
  run bash "$SCRIPTS_DIR/init-vault.sh" "$TEST_TMP/vault"
  [ "$status" -eq 2 ]
}
