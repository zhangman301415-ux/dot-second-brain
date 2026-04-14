#!/usr/bin/env bash
# 测试公共 setup/teardown 函数

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/skills/scripts"
SKILLS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Bats setup: 创建临时目录和测试环境
setup() {
  TEST_TMP=$(mktemp -d)
  TEST_VAULT="$TEST_TMP/vault"
  TEST_HOME="$TEST_TMP/home"
  mkdir -p "$TEST_HOME/.claude"
  # 如果已有 settings.json 则复制，否则创建空配置
  if [ -f "$HOME/.claude/settings.json" ]; then
    cp "$HOME/.claude/settings.json" "$TEST_HOME/.claude/settings.json"
  else
    echo '{"hooks": {}}' > "$TEST_HOME/.claude/settings.json"
  fi
  # 保存原始 settings.json 内容用于恢复
  ORIG_SETTINGS="$TEST_TMP/original_settings.json"
  cp "$HOME/.claude/settings.json" "$ORIG_SETTINGS" 2>/dev/null || echo '{}' > "$ORIG_SETTINGS"
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
     "$TEST_SKILLS/refine-knowledge/scripts/queue-session.sh"
  cp "$SCRIPTS_DIR/../context-loader/scripts/inject-context.sh" \
     "$TEST_SKILLS/context-loader/scripts/inject-context.sh"
}
