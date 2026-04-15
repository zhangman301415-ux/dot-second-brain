# Identity 待更新提案

`00-Identity/pending-updates.md` 用于管理 Identity 层的变更提案。

## 来源

由 refine-knowledge 管线的 Step 2.5（Identity 信号检测）创建和管理。

## 文件结构

```markdown
---
type: identity-pending
created: YYYY-MM-DD
---

# Identity 待更新提案

## [YYYY-MM-DD] - [维度: 角色/能力/价值观/自我认知]
**建议**: 在 `[对应 Identity 文件]` 中追加/修改：...
**证据**:
- YYYY-MM-DD session: "用户原文引用"
**状态**: pending
```

## 提案格式

每个提案是一个 H2 标题，格式为：

```
## [日期] - [维度: 类型]
**建议**: ...
**证据**: ...
**状态**: pending | resolved | rejected
```

| 字段 | 说明 |
|------|------|
| 日期 | 信号检测日期 |
| 维度 | 角色、能力、价值观、自我认知 之一 |
| **建议** | 具体建议内容，注明要修改的 Identity 文件 |
| **证据** | 来源 session 引用 + 用户原文引用 |
| **状态** | `pending` → `resolved`（已写入对应文件）或 `rejected`（用户认为非持久变化） |

## 状态流转

```
pending ──用户确认──→ resolved（已写入对应 Identity 文件，标注处理日期）
      ──用户忽略──→ rejected（用户认为非持久变化，标注处理日期）
      ──用户延迟──→ pending（保持不变）
```

## 去重规则

创建新提案前检查是否已有相同或相似 pending 条目（30 天内），如有则不重复创建。

## 与管线的对应关系

- **Step 2.5 检测**：生成新提案，追加到文件末尾
- **用户确认**：执行建议，更新状态为 resolved
- **用户拒绝**：更新状态为 rejected
