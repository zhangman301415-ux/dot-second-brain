#!/usr/bin/env bash
# 测试公共 setup/teardown 函数

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/skills/scripts"
SKILLS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Bats setup: 创建临时目录和测试环境
setup() {
  TEST_TMP=$(mktemp -d)
  TEST_VAULT="$TEST_TMP/vault"
  export HOME="$TEST_TMP/home"
  mkdir -p "$HOME/.claude"
  echo '{"hooks": {}}' > "$HOME/.claude/settings.json"
}

# Bats teardown: 清理临时目录
teardown() {
  rm -rf "$TEST_TMP"
}

# 创建临时 vault 目录结构（用于 hook 测试）
setup_vault() {
  mkdir -p "$TEST_VAULT/06-Archive/ingest/queue"
  mkdir -p "$TEST_VAULT/04-Working"
  mkdir -p "$TEST_VAULT/06-Archive/ingest/context"
}

# 创建临时 skills 目录结构（用于 mount-hooks 测试）
setup_skills() {
  TEST_SKILLS="$TEST_TMP/skills"
  mkdir -p "$TEST_SKILLS/refine-knowledge/scripts"
  mkdir -p "$TEST_SKILLS/context-loader/scripts"
  # 复制真实脚本
  cp "$SCRIPTS_DIR/../refine-knowledge/scripts/queue-session.sh" \
     "$TEST_SKILLS/refine-knowledge/scripts/queue-session.sh" || return 1
  cp "$SCRIPTS_DIR/../context-loader/scripts/inject-context.sh" \
     "$TEST_SKILLS/context-loader/scripts/inject-context.sh" || return 1
}
