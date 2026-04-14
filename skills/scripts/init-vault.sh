#!/usr/bin/env bash
set -euo pipefail

# 非交互式 vault 初始化脚本
# 用法: bash init-vault.sh <vault-path> [config-path]
#   vault-path: vault 绝对路径
#   config-path: .vault-config.json 路径（默认：脚本上级目录/.vault-config.json）
# 退出码: 0 成功, 1 参数无效, 2 创建失败

VAULT="${1:-}"
export VAULT
if [ -z "$VAULT" ]; then
  echo "错误: 请提供 vault 路径" >&2
  echo "用法: bash init-vault.sh <vault-path>" >&2
  exit 1
fi

# 验证绝对路径
case "$VAULT" in
  /*) ;;
  *)
    echo "错误: vault 路径必须是绝对路径: $VAULT" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="${2:-$SCRIPT_DIR/../.vault-config.json}"
export CONFIG
TODAY=$(date +%Y-%m-%d)

# ============================================================
# 1. 创建目录结构
# ============================================================
mkdir -p "$VAULT/00-Identity/capabilities" \
         "$VAULT/00-Identity/narrative" \
         "$VAULT/00-Identity/preferences" \
         "$VAULT/00-Identity/relationships" \
         "$VAULT/00-Identity/values" \
         "$VAULT/01-Procedural" \
         "$VAULT/02-Semantic/Areas" \
         "$VAULT/02-Semantic/Resources" \
         "$VAULT/03-Episodic" \
         "$VAULT/04-Working" \
         "$VAULT/05-Creation" \
         "$VAULT/06-Archive/ingest/queue" \
         "$VAULT/06-Archive/ingest/context" || exit 2

# ============================================================
# 2. 生成各层索引文件（跳过已存在）
# ============================================================

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
fi

# ============================================================
# 3. 生成 Identity 模板文件（跳过已存在）
# ============================================================

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

EOF
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

EOF
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

EOF
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

EOF
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

EOF
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

EOF
fi

# ============================================================
# 4. 更新 .vault-config.json
# ============================================================
python3 -c '
import json, os

config_path = os.path.expanduser(os.environ["CONFIG"])
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {}

config["vaultPath"] = os.environ["VAULT"]
config["initialized"] = True

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
'

exit 0
