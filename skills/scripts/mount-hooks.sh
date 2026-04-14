#!/usr/bin/env bash
set -euo pipefail

# 非交互式 hook 挂载脚本
# 用法: bash mount-hooks.sh <skills-root>
#   skills-root: skills 目录的绝对路径
# 退出码: 0 成功, 1 参数无效, 2 源脚本缺失

SKILLS_ROOT="${1:-}"
export SKILLS_ROOT
if [ -z "$SKILLS_ROOT" ]; then
  echo "错误: 请提供 skills 根目录路径" >&2
  echo "用法: bash mount-hooks.sh <skills-root>" >&2
  exit 1
fi

HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"

REFINE_SCRIPT="$SKILLS_ROOT/refine-knowledge/scripts/queue-session.sh"
LOADER_SCRIPT="$SKILLS_ROOT/context-loader/scripts/inject-context.sh"

HOOKS_OK=true

if [ -f "$REFINE_SCRIPT" ]; then
  cp "$REFINE_SCRIPT" "$HOOKS_DIR/queue-session.sh"
  chmod +x "$HOOKS_DIR/queue-session.sh"
else
  echo "错误: 未找到 $REFINE_SCRIPT" >&2
  HOOKS_OK=false
fi

if [ -f "$LOADER_SCRIPT" ]; then
  cp "$LOADER_SCRIPT" "$HOOKS_DIR/inject-context.sh"
  chmod +x "$HOOKS_DIR/inject-context.sh"
else
  echo "错误: 未找到 $LOADER_SCRIPT" >&2
  HOOKS_OK=false
fi

# 如果源脚本缺失，不更新 settings.json，避免注册不存在的 hooks
if [ "$HOOKS_OK" = false ]; then
  echo "错误: hook 源脚本缺失，跳过 settings.json 更新" >&2
  exit 2
fi

# 更新 settings.json 中的 hooks 配置
python3 -c '
import json, os

settings_path = os.path.expanduser("~/.claude/settings.json")
default = {"hooks": {}}
if os.path.exists(settings_path):
    with open(settings_path) as f:
        settings = json.load(f)
else:
    settings = default

hooks = settings.setdefault("hooks", {})

stop_hook = {
    "matcher": "",
    "hooks": [
        {"type": "command", "command": "bash ~/.claude/hooks/queue-session.sh"}
    ]
}
session_start_hook = {
    "matcher": "",
    "hooks": [
        {"type": "command", "command": "bash ~/.claude/hooks/inject-context.sh"}
    ]
}

existing_stop = [h for h in hooks.get("Stop", []) if "queue-session" not in str(h)]
existing_start = [h for h in hooks.get("SessionStart", []) if "inject-context" not in str(h)]

hooks["Stop"] = existing_stop + [stop_hook]
hooks["SessionStart"] = existing_start + [session_start_hook]

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
'

# 更新 .vault-config.json
CONFIG="$SKILLS_ROOT/.vault-config.json"
export CONFIG
if [ -f "$CONFIG" ]; then
  python3 -c '
import json, os

config_path = os.path.expanduser(os.environ["CONFIG"])
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {}

config["hooksMounted"] = True

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
'
fi

exit 0
