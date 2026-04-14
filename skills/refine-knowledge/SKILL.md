---
name: refine-knowledge
description: 从 Agent 会话中提取知识，提炼到情景/语义/程式三层记忆。当用户执行 /refine-knowledge 或检测到未处理的会话摘要时触发。
---

# 知识萃取（Refine Knowledge）

知识提炼管线：Working → Episodic → Procedural/Semantic。

## 触发时机

用户输入 `/refine-knowledge` 时触发，或 Agent 检测到 `04-Working/` 下有未处理的 `agent-sessions.md` 时主动提醒用户。

## Vault 结构

本 skill 要求 vault 遵循五层认知架构。目录结构由 `init/install.sh` 创建：

```
04-Working/          ← L1 当前工作
├── YYYY-MM-DD/
│   └── agent-sessions.md  ← 会话摘要（processed: false = 未处理）
03-Episodic/         ← L2 情景记忆
02-Semantic/         ← L3 结构化知识
01-Procedural/       ← L4 已验证方法
00-Identity/         ← L5 身份认知
06-Archive/          ← 归档与摄取
```

## 管线概览

1. **扫描** — 查找未处理的会话文件
2. **提炼 Episodic** — 自主判断，创建情景记忆
3. **提议 Procedural/Semantic** — 检测模式，用户确认后分流
4. **更新索引** — 同步各层索引

详细步骤：
- **管线步骤**: `references/pipeline.md`
- **判断标准**: `references/criteria.md`
- **索引格式**: `references/index-formats.md`

## 执行清单

```
任务进度:
- [ ] Step 1: 扫描未处理会话（列列表给用户确认）
- [ ] Step 2: 提炼 Episodic
- [ ] Step 3: 检测模式 → 提议 Procedural/Semantic（用户确认）
- [ ] Step 4: 更新所有索引
- [ ] 向用户报告结果
```
