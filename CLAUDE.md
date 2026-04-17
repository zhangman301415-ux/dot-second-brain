# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Claude Code Skills 的"第二大脑"知识管理系统，采用五层认知架构。通过 `context-loader`（上下文加载）和 `refine-knowledge`（知识萃取）两个 Skill，自动化实现知识提取与上下文注入，底层使用 Obsidian 风格的 Vault 存储。

## 开发命令

```bash
# 编译 TypeScript 到 dist/
npm run build

# 运行所有测试（先编译）
npm test

# 开发监听模式
npm run build:watch
npm run test:watch
```

测试位于 `tests/`，区分单元测试与集成测试。测试入口在 `tests/helpers/setup.ts`，会自动编译项目并创建临时目录实现隔离。

## CLI 命令（npm 包分发）

| 命令 | 用途 |
|------|------|
| `npx --yes second-brain-cli init-vault <vault-path>` | 创建 Vault 目录结构，生成各层索引和 Identity 模板 |
| `npx --yes second-brain-cli mount-hooks` | 注册 Stop/SessionStart Hook 到 settings.json |
| `npx --yes second-brain-cli-stop-hook` | Stop Hook：备份会话记录，启动 tmux 后台生成摘要 |
| `npx --yes second-brain-cli-session-start-hook` | SessionStart Hook：从归档注入上下文 |

## Hook 机制

- **Stop Hook**（会话结束时触发）：`second-brain-stop-hook` — 捕获会话摘要，排队等待知识萃取
- **SessionStart Hook**（会话开始时触发）：`second-brain-session-start-hook` — 加载当前任务、各层索引及任务相关上下文（Token 预算约 10K-15K）

Hooks 在 `SKILL.md` frontmatter 中声明，通过 `second-brain mount-hooks` 挂载到 settings.json。

## 架构原则

- **Skill 文档承载规则/方法论**，Vault 仅承载内容 — 不混用
- **提案制更新 Identity**：`00-Identity/` 的任何变更需用户明确确认
- **渐进式加载**：从索引到全文，Token 预算可控，避免上下文溢出
- **去重机制**：30 天内相似信号不重复，7 天内被拒绝的提案不重复

## 评估系统

评估系统对 Skill 进行迭代回归测试，详见 `evals/CLAUDE.md`。

## Git Commit 规范

- 使用**中文**编写 commit message
- 格式：`类型: 描述`，例如 `feat: 添加 Vault 初始化脚本`、`fix: 修复 Hook 挂载路径错误`、`test: 适配测试用例`、`refactor: 重构上下文加载逻辑`
- commit message 中**不得出现模型信息**（如 Claude、Sonnet、Opus、Haiku、GPT 等模型名称或版本）
- 不生成 `Co-Authored-By` 署名行

默认 Vault 路径：`~/Documents/obsidian-workspace/obsidian_workspace`
