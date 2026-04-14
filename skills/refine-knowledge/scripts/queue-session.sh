#!/usr/bin/env bash
set -euo pipefail

# Stop hook: Claude Code 会话结束时自动捕获摘要
# 1. 解析 stdin payload
# 2. 备份 JSONL 到 06-Archive/ingest/queue/
# 3. 启动后台 tmux + claude --resume 生成会话摘要
# 4. 写入 04-Working/YYYY-MM-DD/agent-sessions.md

VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/obsidian-workspace/obsidian_workspace}"
QUEUE_DIR="$VAULT/06-Archive/ingest/queue"
WORKING_DIR="$VAULT/04-Working"

PAYLOAD=$(cat)

TRANSCRIPT=$(printf '%s' "$PAYLOAD" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || true)
SESSION_ID=$(printf '%s' "$PAYLOAD" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null || true)

[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0
[ -z "$SESSION_ID" ] && SESSION_ID="unknown"

# 备份 JSONL
mkdir -p "$QUEUE_DIR"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
cp "$TRANSCRIPT" "$QUEUE_DIR/${DATE}-${TIME}-${SESSION_ID}.jsonl"

# 启动后台 tmux 会话进行摘要
WORKING_DATE_DIR="$WORKING_DIR/$DATE"
mkdir -p "$WORKING_DATE_DIR"
SESSION_NAME="refine-${SESSION_ID:0:8}"

# 如果同名 tmux session 已存在，跳过
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  exit 0
fi

tmux new-session -d -s "$SESSION_NAME" \
  "claude -p --resume '$SESSION_ID' --permission-mode auto \
    '请回顾这次会话，生成以下格式的摘要：
    ---
    date: $DATE
    type: agent-session
    processed: false
    session_id: $SESSION_ID
    ---
    ## Session: <时间范围>
    **任务：** <用户的核心任务>
    **做了什么：**
    - 按时间顺序列出关键动作。如果涉及多步骤操作，按阶段分组（如：探索阶段→设计阶段→实现阶段），每个动作写清楚用了什么方法/工具，不只写动作名。
    **结果：** <结果是什么，以及是否有效/用户是否满意>。如果创建了重要文件/代码，用 [[文件名]] 格式引用。
    **决策/犹豫：** <做出了哪些选择？替代选项是什么？为什么选这个？>特别注意：如果用户纠正、否定或要求你改变方向，必须记录——你原来做了什么，用户说了什么，你改成了什么。用户的预期和实际结果有差异吗？
    **教训：** <发现了什么不对/什么有效/什么比预期好或差？在什么条件下有效/无效？>
    **涉及概念：** <概念名> — <在这个上下文中学到了什么/用它做了什么>；<概念名> — <...>
    **建议提炼：** <Episodic/Semantic/Procedural/都不需要> — <原因。如果之前出现过类似问题，提及>' \
    > '$WORKING_DATE_DIR/agent-sessions.md' 2>/dev/null; \
   tmux kill-session -t '$SESSION_NAME'"

exit 0
