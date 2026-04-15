# Agent Session 摘要格式

`04-Working/YYYY-MM-DD/agent-sessions.md` 的结构定义。这是知识萃取管线的输入契约。

## 来源

每个 `agent-sessions.md` 由 Stop Hook（`queue-session.ts`）在会话结束时自动生成：备份完整 JSONL 到归档，启动后台 tmux + `claude --resume` 生成摘要写入此文件。

Prompt 模板位于 `references/session-prompt.md`，脚本运行时读取并注入日期和 session_id 后使用。

## 文件结构

完整格式见 `references/session-prompt.md`，以下为结构概览：

```
---
date: YYYY-MM-DD          ← 会话日期
type: agent-session        ← 固定值
processed: false           ← 处理标记
session_id: xxx            ← Claude Code 会话 ID
---

## Session: <时间范围>
**任务：** ...
**做了什么：** ...
**结果：** ...
**决策/犹豫：** ...
**教训：** ...
**涉及概念：** ...
**用户自我描述：** ...
**建议提炼：** ...
```

## 字段说明

| 字段 | 类型 | 用途 |
|------|------|------|
| `date` | frontmatter | 会话日期，用于文件命名和索引 |
| `type` | frontmatter | 固定值 `agent-session`，用于类型识别 |
| `processed` | frontmatter | `false` = 未处理（管线扫描目标），`true` = 已处理（跳过） |
| `session_id` | frontmatter | Claude Code 会话 ID，用于溯源和去重 |
| **任务** | 正文 | Episodic 背景提取来源 |
| **做了什么** | 正文 | Episodic 关键动作来源，Procedural 模式检测来源 |
| **结果** | 正文 | Episodic 结果来源 |
| **决策/犹豫** | 正文 | Procedural 模式检测、Identity 信号检测（角色/偏好变化） |
| **教训** | 正文 | Episodic 教训/价值来源 |
| **涉及概念** | 正文 | Semantic 知识检测来源 |
| **用户自我描述** | 正文 | Identity 信号检测主要来源 |
| **建议提炼** | 正文 | 管线分流参考（Episodic/Semantic/Procedural） |

## 与管线的对应关系

- **Step 1（扫描）**：读取 frontmatter 的 `processed` 标记
- **Step 2（提炼 Episodic）**：从「任务」「做了什么」「结果」「决策/犹豫」「教训」中提取
- **Step 2.5（检测 Identity）**：主要读取「用户自我描述」，补充读取「决策/犹豫」
- **Step 3（检测模式）**：扫描「做了什么」「教训」「涉及概念」中重复出现的做法
- **Step 4（更新索引）**：从文件名和 frontmatter 中提取索引条目元数据
