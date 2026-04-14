# 管线步骤（Pipeline）

## Step 1: 扫描

```
1. 读取 04-Working/ 下所有 YYYY-MM-DD/ 目录
2. 检查每个目录中 agent-sessions.md 是否存在
3. 读取 frontmatter 中的 processed 标记
4. 输出待处理列表给用户确认

待处理会话：
- 2026-04-14: 会话 abc-123 (processed: false)
- 2026-04-15: 会话 def-456 (processed: false)

是否继续处理以上会话？
```

5. 等待用户确认

## Step 2: 提炼 Episodic（Agent 自主）

对每个 `processed: false` 的会话：

1. 读取完整的 `agent-sessions.md` 内容
2. 根据 `references/criteria.md` 判断是否值得提炼
3. 如果值得：
   - 从任务内容中提取标题
   - 创建文件：`03-Episodic/YYYY-MM-DD-标题.md`
   - 格式：

```markdown
---
date: YYYY-MM-DD
type: episodic
source: agent-session-YYYY-MM-DD-session-xxx
tags: [从内容中提取]
---

# 标题

**背景：** 从"任务"和"做了什么"中提取

**关键决策：**
1. 从"决策/犹豫"中提取

**结果：** 从"结果"中提取

**关联文档：** [[04-Working/YYYY-MM-DD/agent-sessions]]
```

4. 标记 `processed: true`（修改 frontmatter）

## Step 3: 检测可沉淀方法（用户确认 + 分流）

1. 扫描新生成的 Episodic 文件，检测模式：
   - "某种做法反复有效"
   - "验证过的技巧"
2. 分流判断：
   - "怎么做"（技巧/SOP/判断）→ 提议写入 Procedural
   - "是什么"（概念/事实/结构）→ 提议写入 Semantic
   - 两者都有 → 分别提议
3. 向用户展示：

```
检测到以下可沉淀的模式：

1. [标题] — [一句话摘要]
   建议归属: Procedural / Semantic
   来源: [[相关 Episodic]]

确认要沉淀以上模式吗？
```

4. 用户确认 → 写入对应层级
   - Procedural: `01-Procedural/主题名.md`，含方法描述、适用场景、有效性 `⚠️ 待验证`
   - Semantic: `02-Semantic/Resources/` 或 `Areas/` 下对应文件
5. 用户拒绝 → 保留在 Episodic

## Step 4: 更新索引

1. 更新 `03-Episodic/index.md` — 新增情景条目
2. 更新 `01-Procedural/index.md` — 新增方法条目（如有）
3. 更新 `04-Working/active.md` — 最近日志新增条目，标记 `[→ 已提炼]`

完成后向用户报告：

```
整理完成：
- 处理了 N 个会话
- 提炼了 M 个情景到 Episodic
- 提议了 K 个方法（用户确认/拒绝了 X 个）
- 更新了索引
```
