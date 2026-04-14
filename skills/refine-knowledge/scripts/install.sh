#!/usr/bin/env bash
set -euo pipefail

# 初始化脚本：创建 vault 结构 + 挂载 Claude Code hooks
# 用法: bash install.sh
# 脚本会交互式询问 vault 路径

echo "=== Second Brain Vault 初始化 ==="
echo ""

# 1. 询问 vault 路径
DEFAULT_VAULT="$HOME/Documents/obsidian-workspace/obsidian_workspace"
read -p "请输入 vault 路径 [${DEFAULT_VAULT}]: " VAULT
VAULT="${VAULT:-$DEFAULT_VAULT}"

# 确认路径
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

# 定位 skill 安装路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# scripts/install.sh → skills/
SKILLS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "1/4 创建目录结构..."
mkdir -p "$VAULT/00-Identity"
mkdir -p "$VAULT/01-Procedural"
mkdir -p "$VAULT/02-Semantic/Areas"
mkdir -p "$VAULT/02-Semantic/Resources"
mkdir -p "$VAULT/03-Episodic"
mkdir -p "$VAULT/04-Working"
mkdir -p "$VAULT/05-Creation"
mkdir -p "$VAULT/06-Archive/ingest/queue"
mkdir -p "$VAULT/06-Archive/ingest/context"

echo "  ✓ 00-Identity/  01-Procedural/  02-Semantic/"
echo "  ✓ 03-Episodic/  04-Working/     05-Creation/"
echo "  ✓ 06-Archive/ingest/{queue,context}/"

# 2. 生成 AGENTS.md（如不存在）
echo "2/4 生成 AGENTS.md..."
if [ ! -f "$VAULT/AGENTS.md" ]; then
  cat > "$VAULT/AGENTS.md" << 'AGENTS_EOF'
# Agent 行为规范

> 本 vault 使用 `refine-knowledge` 和 `context-loader` 两个 skill 管理知识的萃取与加载。

## 一、认知架构

| 层级 | 核心问题 | 对应目录 |
| --- | ------- | ---------------- |
| L5 | 我是谁？ | `00-Identity/` |
| L4 | 我怎么做？ | `01-Procedural/` |
| L3 | 我知道什么？ | `02-Semantic/` |
| L2 | 发生过什么？ | `03-Episodic/` |
| L1 | 当前在做什么？ | `04-Working/` |

输出层 `05-Creation/` 和归档 `06-Archive/` 不属于认知层。

详见 `refine-knowledge` 和 `context-loader` skill 的 SKILL.md。

## 二、Agent 操作边界

- L5 Identity: 更新必须询问用户
- L4 Procedural: 修改已有内容需询问用户，新建无需询问
- L3 Semantic: 自由读写
- L2 Episodic: 自由写入
- L1 Working: 自由读写

## 三、命名规则

文件夹名是**内容主题名**（`LangChain/`），不是**形式名/活动名**（`langchain学习/`）。

## 四、文件流转

文件跟着归属走，不跟着使用场景走。
AGENTS_EOF
  echo "  ✓ AGENTS.md 已创建"
else
  echo "  - AGENTS.md 已存在，跳过"
fi

# 3. 挂载 Claude Code hooks
echo "3/4 挂载 Claude Code hooks..."

HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"

REFINE_SCRIPT="$SKILLS_ROOT/refine-knowledge/scripts/queue-session.sh"
LOADER_SCRIPT="$SKILLS_ROOT/context-loader/scripts/inject-context.sh"

if [ -f "$REFINE_SCRIPT" ]; then
  cp "$REFINE_SCRIPT" "$HOOKS_DIR/queue-session.sh"
  chmod +x "$HOOKS_DIR/queue-session.sh"
  echo "  ✓ Stop hook: $HOOKS_DIR/queue-session.sh"
else
  echo "  ✗ 未找到 queue-session.sh（$REFINE_SCRIPT）"
fi

if [ -f "$LOADER_SCRIPT" ]; then
  cp "$LOADER_SCRIPT" "$HOOKS_DIR/inject-context.sh"
  chmod +x "$HOOKS_DIR/inject-context.sh"
  echo "  ✓ SessionStart hook: $HOOKS_DIR/inject-context.sh"
else
  echo "  ✗ 未找到 inject-context.sh（$LOADER_SCRIPT）"
fi

# 配置 settings.json
python3 -c "
import json, os

settings_path = os.path.expanduser('~/.claude/settings.json')
default = {'hooks': {}}
if os.path.exists(settings_path):
    with open(settings_path) as f:
        settings = json.load(f)
else:
    settings = default

hooks = settings.setdefault('hooks', {})

stop_hook = {
    'matcher': '',
    'hooks': [
        {'type': 'command', 'command': 'bash ~/.claude/hooks/queue-session.sh'}
    ]
}
session_start_hook = {
    'matcher': '',
    'hooks': [
        {'type': 'command', 'command': 'bash ~/.claude/hooks/inject-context.sh'}
    ]
}

existing_stop = [h for h in hooks.get('Stop', []) if 'queue-session' not in str(h)]
existing_start = [h for h in hooks.get('SessionStart', []) if 'inject-context' not in str(h)]

hooks['Stop'] = existing_stop + [stop_hook]
hooks['SessionStart'] = existing_start + [session_start_hook]

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print('  ✓ hooks 已配置到 settings.json')
"

# 4. 生成初始索引文件（如不存在）
echo "4/4 生成初始索引..."

TODAY=$(date +%Y-%m-%d)

if [ ! -f "$VAULT/03-Episodic/index.md" ]; then
  cat > "$VAULT/03-Episodic/index.md" << EOF
---
type: episodic
created: $TODAY
---

# Episodic Memory — 情景索引

> 发生过什么？从原始数据中提炼出的有意义的情景记忆。

## 情景索引
| 事件 | 关键词 | 教训/价值 | 日期 |
|------|--------|-----------|------|
EOF
  echo "  ✓ 03-Episodic/index.md"
fi

if [ ! -f "$VAULT/04-Working/active.md" ]; then
  cat > "$VAULT/04-Working/active.md" << EOF
---
type: working
created: $TODAY
---

# Working — 当前活跃关注点

## 活跃项目
-

## 独立任务
-

## 犹豫中的决策
-

## 最近日志
-
EOF
  echo "  ✓ 04-Working/active.md"
fi

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "Vault 路径: $VAULT"
echo "下次启动 Claude Code 时，Stop hook 会自动捕获会话摘要。"
echo "使用 /refine-knowledge 命令触发知识提炼管线。"
