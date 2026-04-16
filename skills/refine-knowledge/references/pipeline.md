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
   - 创建文件：`03-Episodic/YYYY-MM-DD-标题.md`（格式见 `references/vault-templates/episodic-entry-template.md`）

4. 标记 `processed: true`（修改 frontmatter）

## Step 2.5: 检测 Identity 信号（Agent 自主 + 提案制）

对 Step 1 扫描到的每个待处理会话（不依赖 processed 标记，Step 2 和 Step 2.5 共享同一批会话）：

1. 读取 session 摘要中的 `用户自我描述` 字段
2. 如果该字段为空，检查 `决策/犹豫` 中是否有角色/偏好变化表述
3. 根据 `references/criteria.md` 的 L5 信号检测标准判断
4. 如果有信号：
   a. 读取已有 `00-Identity/pending-updates.md`（如不存在则创建）
   b. 检查是否已有相同/相似 pending 条目（去重，30 天内）
   c. 生成新 pending 条目，追加到文件（格式见模板 HTML 注释）

5. 提示用户：
```
我注意到了一个可能的 Identity 变化，已写入 `00-Identity/pending-updates.md`。
你要现在确认、忽略，还是稍后处理？
```

6. 用户确认 → 将建议写入对应 Identity 文件，从 pending 中标记为 resolved
   用户忽略 → 标记为 rejected
   用户稍后 → 保持 pending

   **turning-points.md 格式**：事件列使用 `[[源路径|事件摘要]]` 格式的 wikilink，源路径指向触发该转折的文件（如 `03-Episodic/2026-04-15-数据管道架构选型`、`02-Semantic/重构思维模式` 等，不限层级）。

**统一追溯规则**：所有 Identity 文件（profile.md、current-skills.md、core-values.md、work-style.md、communities.md、pending-updates.md、growth-trajectory.md、turning-points.md）的每条声明必须附带 `[[源路径\|摘要]]` 格式的 wikilink 来源引用（注意表格中管道符需转义为 `\\\|`）。源路径相对于 vault 根目录，指向触发该声明的 Episodic、Semantic、Procedural 或 Working 文件。不接受无来源的 Identity 声明。

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
