# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 评估系统概述

对 Skill 进行迭代回归测试。流程：从 vault 快照恢复初始状态 → 触发 skill → 比较 vault diff → 断言评分 → 聚合指标并与上一轮对比。

## 目录结构

```
evals/
├── runner/                    # vault-snapshot CLI 工具（TypeScript，编译至 dist/）
│   └── vault-snapshot.ts      # Vault 快照：初始化、快照创建、diff 比较、目录复制
├── vaults/<skill_name>/       # 测试用例 vault 快照（源文件，不参与编译）
│   └── <scenario>/
│       └── eval.json          # 用例定义
│       └── <vault files...>   # 初始 vault 状态
└── workspace/<skill_name>/    # 评估输出（自动生成）
    └── iteration-N/
        ├── skills_snapshot/   # 本轮评估时 skill 目录的内容快照
        ├── eval-<name>/
        │   ├── initial_vault/   # 运行前快照
        │   ├── final_vault/     # 运行后快照
        │   ├── vault_diff.txt   # 文件变更摘要
        │   ├── grading.json     # 评分结果
        │   └── timing.json      # 耗时记录
        └── benchmark.json     # 聚合指标 + 与上一轮 delta
```

## 运行评估

从项目根目录或 `evals/` 目录启动 Claude Code 会话，然后告诉 agent：

```
运行 refine-knowledge 的评估
```

Agent 会按下方流程自动执行。

如需指定 skill 路径，请补充说明：

```
运行 context-loader 的评估，skill 路径为 skills/context-loader
```

## 评估流程

### 步骤 1: 发现测试用例

扫描 `evals/vaults/<skill_name>/` 下所有包含 `eval.json` 的子目录。每个子目录是一个测试用例。

`eval.json` 格式：

```json
{
  "id": 1,
  "name": "scenario-name",
  "prompt": "/refine-knowledge",
  "description": "描述测试场景",
  "expected_output": "期望的输出行为",
  "assertions": [
    "可验证的断言 1",
    "可验证的断言 2"
  ]
}
```

字段说明：
- `id`：用例编号，按技能内递增
- `name`：场景名
- `prompt`：用户触发 skill 的命令/操作
- `description`：测试什么
- `expected_output`：期望行为描述（供评分参考）
- `assertions`：可验证的断言列表，每条必须能被 vault 文件内容证实或证伪

### 步骤 2: 计算迭代号

读取 `evals/workspace/<skill_name>/` 目录，找到所有 `iteration-N` 形式的目录名，取最大 N 作为当前迭代号 + 1。

创建迭代目录：`evals/workspace/<skill_name>/iteration-N/`

#### 2a. 创建 skill 内容快照

将当前 skill 目录完整复制到 `evals/workspace/<skill_name>/iteration-N/skills_snapshot/`：

```bash
node dist/evals/runner/vault-snapshot.js copy skills/<skill_name> evals/workspace/<skill_name>/iteration-N/skills_snapshot
```

这样每一轮迭代都保存当时使用的 skill 内容（SKILL.md、脚本文件等），便于后续对比 skill 的变更对评估结果的影响。

### 步骤 3: 对每个用例循环执行

#### 3a. 初始化 vault

创建用例输出目录：`evals/workspace/<skill_name>/iteration-N/eval-<name>/`

运行以下命令从模板初始化工作 vault：

```bash
node dist/evals/runner/vault-snapshot.js init evals/vaults/<skill_name>/<name> evals/workspace/<skill_name>/iteration-N/eval-<name>/vault
```

#### 3b. 创建 initial 快照

```bash
node dist/evals/runner/vault-snapshot.js snapshot evals/workspace/<skill_name>/iteration-N/eval-<name>/vault evals/workspace/<skill_name>/iteration-N/eval-<name>/initial_vault
```

#### 3c. 启动 executor subagent 执行 skill

启动一个 subagent，向其提供以下信息：
- eval.json 中的 `prompt`、`description`、`expected_output`
- 工作 vault 目录路径
- Skill 的 SKILL.md 内容（从 `evals/workspace/<skill_name>/iteration-N/skills_snapshot/SKILL.md` 读取，如果该文件存在）

Subagent 的 prompt 模板：

```
请在以下 Vault 目录中执行知识萃取任务。

工作目录: <vault_path>

任务说明: <description>
期望输出: <expected_output>

请按以下 SKILL.md 中的规则执行：

<skill_instructions>

请读取工作目录中的文件并按要求处理。完成后结束即可。
```

**约束**：subagent 只允许使用 Read, Write, Bash, Edit, Grep, Glob 工具。

#### 3d. 创建 final 快照

```bash
node dist/evals/runner/vault-snapshot.js snapshot evals/workspace/<skill_name>/iteration-N/eval-<name>/vault evals/workspace/<skill_name>/iteration-N/eval-<name>/final_vault
```

#### 3e. 生成 diff

```bash
node dist/evals/runner/vault-snapshot.js diff evals/workspace/<skill_name>/iteration-N/eval-<name>/initial_vault evals/workspace/<skill_name>/iteration-N/eval-<name>/final_vault
```

将 diff 输出写入 `evals/workspace/<skill_name>/iteration-N/eval-<name>/vault_diff.txt`

同时运行以下命令获取 JSON 格式的 diff 用于评分：

```bash
node dist/evals/runner/vault-snapshot.js diff evals/workspace/<skill_name>/iteration-N/eval-<name>/initial_vault evals/workspace/<skill_name>/iteration-N/eval-<name>/final_vault --format json
```

#### 3f. 启动 grader subagent 评分

启动一个只读 subagent，向其提供以下信息：
- eval.json 中的 `assertions` 列表
- vault diff 摘要（JSON 格式的 added/modified/deleted 列表）
- initial_vault 和 final_vault 目录路径

Subagent 的 prompt 模板：

```
你是一个知识管理系统的质量评估员。请根据以下信息对测试结果进行评分。

## 测试用例信息
- 场景: <name>
- 描述: <description>
- 期望输出: <expected_output>

## Vault 变更摘要
<diff_summary>

## 断言列表

请逐条评估以下断言是否成立：

1. <assertion_1>
2. <assertion_2>
...

## 评分规则

- **PASS**：断言明确成立，有具体证据支持
- **FAIL**：断言不成立，或证据不足
- 每条断言必须给出 **passed**（true/false）和 **evidence**（引用具体文件或内容作为证据）
- 证据必须引用实际观察到的内容，不能只说"根据输出判断"
- 使用 Read 工具查看 vault 文件内容来验证断言

## 输出格式

请只输出一个 JSON 对象，不要包含任何其他文字或解释：

{
  "assertion_results": [
    {"text": "断言原文", "passed": true, "evidence": "具体证据"},
    ...
  ]
}
```

**约束**：subagent 只允许使用 Read, Bash 工具。禁止使用 Write。

#### 3g. 保存评分结果

将 grader subagent 返回的 JSON 写入 `evals/workspace/<skill_name>/iteration-N/eval-<name>/grading.json`

记录耗时到 `evals/workspace/<skill_name>/iteration-N/eval-<name>/timing.json`：

```json
{
  "total_tokens": 0,
  "duration_ms": <步骤3a到3f的总毫秒数>
}
```

### 步骤 4: 聚合结果

计算所有用例的统计指标：

- 平均通过率：各用例 `passed/total` 的均值和标准差
- 平均耗时：各用例 `duration_ms/1000` 的均值和标准差
- 平均 Token：各用例 `total_tokens` 的均值和标准差

如果存在上一轮迭代（`iteration-N-1/benchmark.json`），计算 delta（当前均值 - 上一轮均值）。

写入 `evals/workspace/<skill_name>/iteration-N/benchmark.json`：

```json
{
  "current_iteration": N,
  "iterations": {
    "iteration-N": {
      "pass_rate": { "mean": 0.85, "stddev": 0.12 },
      "time_seconds": { "mean": 45.2, "stddev": 5.1 },
      "tokens": { "mean": 0, "stddev": 0 }
    }
  },
  "delta": {
    "pass_rate": 0.05,
    "time_seconds": -2.3,
    "tokens": 0
  }
}
```

delta 字段仅在存在上一轮数据时出现。

## 断言编写规范

编写新的 eval.json 时遵循：

- 断言应**具体可观察**，避免"正常运行"这类模糊描述
- 优先断言文件存在/内容/结构变化，例如：
  - `在 03-Episodic/ 下创建至少 1 个情景记忆文件`
  - `Episodic 记忆文件 frontmatter 包含 date、tags、session_ref`
  - `会话文件 frontmatter 中 processed 标记为 true`
- 每个用例 4-8 条断言为宜，覆盖核心路径和边界情况

## 核心模块

### vault-snapshot.ts

纯文件系统操作的 CLI 工具：

```bash
# 从模板目录初始化 vault
node dist/evals/runner/vault-snapshot.js init <templateDir> <targetDir>

# 创建快照
node dist/evals/runner/vault-snapshot.js snapshot <sourceDir> <targetDir>

# 比较两个快照（text 或 json 格式）
node dist/evals/runner/vault-snapshot.js diff <beforeDir> <afterDir> [--format=text|json]

# 复制目录（用于 skill 快照）
node dist/evals/runner/vault-snapshot.js copy <sourceDir> <targetDir>
```
