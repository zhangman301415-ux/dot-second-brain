#!/usr/bin/env bash
set -euo pipefail

# 交互式安装入口（CLI 用户备用）
# Agent 用户应直接调用 scripts/init-vault.sh 和 scripts/mount-hooks.sh

echo "=== Second Brain Vault 初始化 ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_VAULT="$HOME/Documents/obsidian-workspace/obsidian_workspace"

read -p "请输入 vault 路径 [${DEFAULT_VAULT}]: " VAULT
VAULT="${VAULT:-$DEFAULT_VAULT}"

if [ -e "$VAULT" ] && [ "$(ls -A "$VAULT" 2>/dev/null)" ]; then
  echo ""
  echo "⚠️  目录已存在: $VAULT"
  read -p "继续初始化（不会覆盖已有文件）? [y/N]: " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy] ]]; then
    echo "已取消"
    exit 0
  fi
else
  echo ""
  echo "将创建: $VAULT"
  read -p "确认? [Y/n]: " CONFIRM
  if [[ "$CONFIRM" =~ ^[Nn] ]]; then
    echo "已取消"
    exit 0
  fi
fi

echo ""
echo "1/2 创建 vault 结构..."
bash "$SCRIPT_DIR/init-vault.sh" "$VAULT"
echo "  ✓ vault 结构已创建: $VAULT"

echo ""
read -p "2/2 是否挂载 Claude Code hooks？[Y/n]: " HOOKS
if [[ ! "$HOOKS" =~ ^[Nn] ]]; then
  bash "$SCRIPT_DIR/mount-hooks.sh" "$SKILLS_ROOT"
  echo "  ✓ hooks 已挂载"
else
  echo "  - 跳过 hook 挂载"
fi

echo ""
echo "=== 初始化完成 ==="
echo "Vault 路径: $VAULT"
echo "下次启动 Claude Code 时，Stop hook 会自动捕获会话摘要。"
