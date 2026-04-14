#!/usr/bin/env bash
# SessionStart hook: 注入上次会话摘要到当前上下文
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/obsidian-workspace/obsidian_workspace}"
CONTEXT="$VAULT/06-Archive/ingest/context/latest.md"

[ -f "$CONTEXT" ] && cat "$CONTEXT"
exit 0
