# 索引格式（Index Formats）

## 03-Episodic/index.md

```markdown
---
type: episodic
created: YYYY-MM-DD
---

# Episodic Memory — 情景索引

> 发生过什么？从原始数据中提炼出的有意义的情景记忆。

## 情景索引
| 事件 | 关键词 | 教训/价值 | 日期 |
|------|--------|-----------|------|
| ASP 项目需求确认会 | asp, requirements, product-design | 用户拒绝了 A 方案，倾向 B 方案 | 2026-04-11 |
```

## 01-Procedural/index.md

```markdown
---
type: procedural
created: YYYY-MM-DD
---

# Procedural Memory — 方法论索引

> 记录经过实践验证的方法论、SOP、工作流。
> 不是"我觉得应该这样做"，而是"我这样做确实有效"。

## 方法论索引
| 方法 | 适用场景 | 有效性 | 关联 Episodic | 日期 |
|------|----------|--------|--------------|------|
| 分级沉淀规则 | Agent 工作记录提炼 | ✅ 已验证 | [[首次设计 Agent 工作记录与沉淀规则]] | 2026-04-12 |

**有效性字段：**
- `✅ 已验证` — 被引用后效果良好
- `⚠️ 待验证` — 刚沉淀，未经过实践检验
- `❌ 有局限` — 实践发现不适用于某些场景
```

## 04-Working/active.md 最近日志

```markdown
## 最近日志
- 2026-04-12: Agent 工作记录系统设计 — 确立了混合数据源 + 分级沉淀模式 [→ 已提炼]
```
