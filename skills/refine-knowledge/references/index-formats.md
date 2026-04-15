# 索引格式（Index Formats）

各层索引和 active.md 的结构定义。实际模板内容见 `vault-templates/` 目录。

## 索引文件列表

| 文件 | 模板 | 用途 |
|------|------|------|
| `03-Episodic/index.md` | `episodic-index-template.md` | 情景记忆索引 |
| `01-Procedural/index.md` | `procedural-index-template.md` | 方法论索引 |
| `02-Semantic/index.md` | `semantic-index-template.md` | 知识索引（Areas + Resources） |
| `04-Working/active.md` | `active-template.md` | 当前活跃关注点 |

## 索引列定义

### Episodic index

| 列名 | 说明 |
|------|------|
| 事件 | 情景标题，与 Episodic 文件名对应（去掉日期前缀和 .md） |
| 关键词 | 逗号分隔，用于相关性匹配 |
| 教训/价值 | 一句话总结 |
| 日期 | 事件日期 YYYY-MM-DD |

### Procedural index

| 列名 | 说明 |
|------|------|
| 方法 | 方法名称 |
| 适用场景 | 什么情况下使用 |
| 有效性 | ✅ 已验证 / ⚠️ 待验证 / ❌ 有局限 |
| 关联 Episodic | 来源事件，[[文件名]] 格式 |
| 日期 | 沉淀日期 YYYY-MM-DD |

### Semantic index

| 列名 | 说明 |
|------|------|
| 主题 | 知识主题名称，对应 Areas/ 或 Resources/ 下的文件/目录 |
| 说明 | 一句话说明是什么 |
| 最近更新 | 最后修改日期 YYYY-MM-DD |

### active.md

| 部分 | 说明 |
|------|------|
| 活跃项目 | 长期进行的项目，每个占一行 |
| 独立任务 | 短期独立工作 |
| 犹豫中的决策 | 尚未确定的选择 |
| 最近日志 | 按日期倒序追加，格式 `YYYY-MM-DD: 事件 — [→ 已提炼]` |

## Agent 行为规则

- context-loader 从 active.md 提取关键词（活跃项目、独立任务），用于各层索引的相关性匹配
- 新增索引条目时，同步更新对应的索引文件
- 维护规则详见各模板文件中的 HTML 注释
