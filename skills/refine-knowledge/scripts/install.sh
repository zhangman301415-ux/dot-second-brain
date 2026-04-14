#!/usr/bin/env bash
set -euo pipefail

# 初始化脚本：创建完整的五层认知架构 vault 结构 + 挂载 Claude Code hooks
# 用法: bash install.sh

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
SKILLS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TODAY=$(date +%Y-%m-%d)

# ============================================================
# 1. 创建目录结构
# ============================================================
echo ""
echo "1/4 创建目录结构..."
mkdir -p "$VAULT/00-Identity/capabilities"
mkdir -p "$VAULT/00-Identity/narrative"
mkdir -p "$VAULT/00-Identity/preferences"
mkdir -p "$VAULT/00-Identity/relationships"
mkdir -p "$VAULT/00-Identity/values"
mkdir -p "$VAULT/01-Procedural"
mkdir -p "$VAULT/02-Semantic/Areas"
mkdir -p "$VAULT/02-Semantic/Resources"
mkdir -p "$VAULT/03-Episodic"
mkdir -p "$VAULT/04-Working"
mkdir -p "$VAULT/05-Creation"
mkdir -p "$VAULT/06-Archive/ingest/queue"
mkdir -p "$VAULT/06-Archive/ingest/context"

echo "  ✓ 00-Identity/{capabilities,narrative,preferences,relationships,values}/"
echo "  ✓ 01-Procedural/  02-Semantic/{Areas,Resources}/"
echo "  ✓ 03-Episodic/    04-Working/    05-Creation/"
echo "  ✓ 06-Archive/ingest/{queue,context}/"

# ============================================================
# 2. 挂载 Claude Code hooks
# ============================================================
echo "2/4 挂载 Claude Code hooks..."

HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"

REFINE_SCRIPT="$SKILLS_ROOT/refine-knowledge/scripts/queue-session.sh"
LOADER_SCRIPT="$SKILLS_ROOT/context-loader/scripts/inject-context.sh"

if [ -f "$REFINE_SCRIPT" ]; then
  cp "$REFINE_SCRIPT" "$HOOKS_DIR/queue-session.sh"
  chmod +x "$HOOKS_DIR/queue-session.sh"
  echo "  ✓ Stop hook: $HOOKS_DIR/queue-session.sh"
else
  echo "  ✗ 未找到 queue-session.sh"
fi

if [ -f "$LOADER_SCRIPT" ]; then
  cp "$LOADER_SCRIPT" "$HOOKS_DIR/inject-context.sh"
  chmod +x "$HOOKS_DIR/inject-context.sh"
  echo "  ✓ SessionStart hook: $HOOKS_DIR/inject-context.sh"
else
  echo "  ✗ 未找到 inject-context.sh"
fi

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

# ============================================================
# 3. 生成各层索引文件
# ============================================================
echo "3/4 生成索引文件..."


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
else
  echo "  - index.md 已存在，跳过"
fi

if [ ! -f "$VAULT/01-Procedural/index.md" ]; then
cat > "$VAULT/01-Procedural/index.md" << EOF
---
type: procedural
created: $TODAY
---

# Procedural Memory — 方法论索引

> 记录经过实践验证的方法论、SOP、工作流。
> 不是"我觉得应该这样做"，而是"我这样做确实有效"。

## 方法论索引
| 方法 | 适用场景 | 有效性 | 关联 Episodic | 日期 |
|------|----------|--------|--------------|------|

**有效性字段：**
- ✅ 已验证 — 被引用后效果良好
- ⚠️ 待验证 — 刚沉淀，未经过实践检验
- ❌ 有局限 — 实践发现不适用于某些场景
EOF
echo "  ✓ $VAULT/01-Procedural/index.md"
else
  echo "  - index.md 已存在，跳过"
fi

if [ ! -f "$VAULT/02-Semantic/index.md" ]; then
cat > "$VAULT/02-Semantic/index.md" << 'EOF'
---
type: semantic
created: auto
---

# Semantic Knowledge — 知识索引

> 我知道什么？结构化的领域知识和参考资料。

## Areas（我需要负责的事）

| 主题 | 说明 | 最近更新 |
|------|------|----------|

## Resources（我觉得有用的资料）

| 主题 | 说明 | 最近更新 |
|------|------|----------|

## 维护规则

- 新增知识时，在本文件中添加条目
- 不确定 Areas vs Resources 时，优先 Resources
EOF
echo "  ✓ $VAULT/02-Semantic/index.md"
else
  echo "  - index.md 已存在，跳过"
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
echo "  ✓ $VAULT/04-Working/active.md"
else
  echo "  - active.md 已存在，跳过"
fi

# ============================================================
# 4. 生成 Identity 模板文件
# ============================================================
echo "4/4 生成 Identity 模板..."


# Identity files use create_if_missing since content is static
if [ ! -f "$VAULT/00-Identity/profile.md" ]; then
cat > "$VAULT/00-Identity/profile.md" << 'EOF'
---
type: profile
created: auto
version: "1.0"
---

# 核心身份卡

---

## 自我概念

<!-- 用 2-3 句话描述：你是谁、在做什么、想成为什么样的人 -->

**我是谁:**


**我当前在做什么:**


**我想成为什么样的人:**


---

## 活跃关注领域

- [[ ]] 关注领域 1
- [[ ]] 关注领域 2

---

## 当前角色

| 角色 | 上下文 | 时间跨度 |
|------|--------|----------|
| | | |

---

## 关键属性

- **语言偏好:** 中文为主
- **思维方式:**
- **核心驱动力:**

---

EOF
echo "  ✓ $VAULT/00-Identity/profile.md"
else
  echo "  - profile.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/values/core-values.md" ]; then
cat > "$VAULT/00-Identity/values/core-values.md" << 'EOF'
---
type: identity
category: values
created: auto
---

# 核心价值观

> 这些是我做出决策和评判事物的根本原则。

---

## 核心价值观

1. **价值 1** — 为什么这对你重要，它如何指导你的行为

2. **价值 2** — 为什么这对你重要，它如何指导你的行为

3. **价值 3** — 为什么这对你重要，它如何指导你的行为

---

## 行为原则

- 原则 1
- 原则 2

---

---

EOF
echo "  ✓ $VAULT/00-Identity/values/core-values.md"
else
  echo "  - core-values.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/capabilities/current-skills.md" ]; then
cat > "$VAULT/00-Identity/capabilities/current-skills.md" << 'EOF'
---
type: identity
category: capabilities
created: auto
---

# 当前技能矩阵

> 不是"我学过什么"，而是"我实际能做什么"。

---

## 技能表

| 技能 | 水平 | 最后验证 | 参考方法 |
|------|------|---------|---------|
| | | | |

**水平定义：**
- 初学者：知道概念，需要指导
- 入门：能独立完成简单任务
- 中级：能解决常见问题，偶尔卡住
- 高级：能设计解决方案，教别人
- 专家：能创造新方法，定义标准

---

## 短板清单

-

---

---

EOF
echo "  ✓ $VAULT/00-Identity/capabilities/current-skills.md"
else
  echo "  - current-skills.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/capabilities/growth-trajectory.md" ]; then
cat > "$VAULT/00-Identity/capabilities/growth-trajectory.md" << 'EOF'
---
type: identity
category: capabilities
created: auto
---

# 能力演进轨迹

> 记录我在各领域的成长路径和方向。

---

## 当前成长方向

-

---

## 成长历程

| 时间段 | 领域 | 起点 | 当前 | 下一步 |
|--------|------|------|------|--------|
| | | | | |

---

---

EOF
echo "  ✓ $VAULT/00-Identity/capabilities/growth-trajectory.md"
else
  echo "  - growth-trajectory.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/preferences/work-style.md" ]; then
cat > "$VAULT/00-Identity/preferences/work-style.md" << 'EOF'
---
type: identity
category: preferences
created: auto
---

# 工作偏好

> 记录我**自然地**倾向于怎么工作。

---

## 工作时间偏好

- **高效时段：**
- **低效时段：**
- **工作节奏：**

---

## 协作偏好

- **沟通方式：**
- **反馈节奏：**
- **决策风格：**

---

## 学习偏好

- **学习方式：**
- **知识粒度：**
- **复习频率：**

---

---

EOF
echo "  ✓ $VAULT/00-Identity/preferences/work-style.md"
else
  echo "  - work-style.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/narrative/turning-points.md" ]; then
cat > "$VAULT/00-Identity/narrative/turning-points.md" << 'EOF'
---
type: identity
category: narrative
created: auto
---

# 转折点

> 记录塑造了我当前身份的关键事件和决策。

---

## 时间线

| 日期 | 事件 | 如何改变了我 |
|------|------|-------------|
| | | |

---

---

EOF
echo "  ✓ $VAULT/00-Identity/narrative/turning-points.md"
else
  echo "  - turning-points.md 已存在，跳过"
fi

if [ ! -f "$VAULT/00-Identity/relationships/communities.md" ]; then
cat > "$VAULT/00-Identity/relationships/communities.md" << 'EOF'
---
type: identity
category: relationships
created: auto
---

# 所属社群

> 我参与的社区、组织和圈子。

---

## 社群列表

| 社群 | 角色 | 参与方式 | 时间 |
|------|------|---------|------|
| | | | |

---

---

EOF
echo "  ✓ $VAULT/00-Identity/relationships/communities.md"
else
  echo "  - communities.md 已存在，跳过"
fi

# ============================================================
# 完成
# ============================================================
echo ""
echo "=== 初始化完成 ==="
echo ""
echo "Vault 路径: $VAULT"
echo "下次启动 Claude Code 时，Stop hook 会自动捕获会话摘要。"
echo "使用 /refine-knowledge 命令触发知识提炼管线。"
