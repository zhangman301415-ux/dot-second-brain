# Second Brain

基于 **Claude Code Skills** 实现的"第二大脑"知识管理系统，采用五层认知架构，构建能主动学习、沉淀知识并协助工作方法论演进的 AI 协作者。

## 安装

本项目包含两个独立组件，需要分别安装：

| 组件 | 分发方式 | 作用 |
|------|----------|------|
| **CLI** | npm 包（`second-brain-cli`） | Vault 初始化、Hook 注册、会话摘要排队 |
| **Skills** | npx skills | context-loader 和 refine-knowledge 两个 Agent Skill |

### 1. 安装 CLI

```bash
npm install -g second-brain-cli
```

安装完成后即可使用：

```bash
second-brain-cli mount-hooks
```

### 2. 安装 Skills

```bash
npx skills add zhangman301415-ux/second-brain
```

Skills 安装后会自动注册到 Claude Code，新会话中即可使用。

### 首次使用

安装后首次触发 Skill（如新会话开始或执行 `/refine-knowledge`）时会自动完成初始化：

1. **Vault 初始化** — 创建五层认知目录结构，生成索引和 Identity 模板
2. **Hook 自动注册** — 自动将 `Stop` 和 `SessionStart` hooks 注册到 `~/.claude/settings.json`

首次触发时仅会询问 vault 路径，Hook 注册无需用户确认。

默认 Vault 路径：`~/Documents/SecondBrain`

## 卸载

如需完全移除 Second Brain，需分别清理 CLI、Skills 和已注册的 Hooks：

### 1. 卸载 CLI

```bash
npm uninstall -g second-brain-cli
```

### 2. 移除 Skills

在 Claude Code 中执行：

```
/skills remove zhangman301415-ux/second-brain
```

或通过 Claude Code 设置页面手动移除。

### 3. 清理 Hooks

编辑 `~/.claude/settings.json`，删除 `second-brain-cli queue-session` 和 `second-brain-cli inject-context` 相关的 hook 配置条目。

## 快速开始

### 开发 & 测试

```bash
# 安装依赖
npm install

# 编译 TypeScript + 复制模板
npm run build

# 运行测试
npm test
```

### 日常使用

```bash
# 挂载 Hooks
second-brain-cli mount-hooks

# 初始化 Vault
second-brain-cli init-vault <vault-path>
```

Skill 安装后即可使用，无需额外配置：

- **`/refine-knowledge`** — 手动触发知识萃取
- 新会话自动触发上下文加载
- 会话结束自动捕获摘要并排队知识萃取

## 架构

```
.
├── commands/                       # CLI 命令逻辑（TypeScript）
│   ├── init-vault.ts               # Vault 初始化
│   ├── mount-hooks.ts              # Hook 注册
│   ├── inject-context.ts           # SessionStart Hook 处理
│   └── queue-session.ts            # Stop Hook 处理
├── skills/                         # Claude Code Skills 核心（纯 Markdown + 模板）
│   ├── context-loader/
│   │   └── SKILL.md
│   └── refine-knowledge/
│       ├── SKILL.md
│       └── references/             # 模板（唯一源，SKILL 引用 + CLI 构建时复制）
├── bin/                            # CLI 入口脚本（npm 分发）
│   └── cli.js                      # 主 CLI: second-brain-cli
├── scripts/
│   └── copy-templates.mjs          # 构建时复制模板到 dist/templates/
├── evals/                          # 评估系统（回归测试）
├── tests/                          # 单元测试 & 集成测试
├── docs/                           # 设计文档
├── dist/                           # 编译输出（含命令 + 模板副本）
└── .claude/                        # Claude Code 配置
```

## 五层认知模型

| 层级 | 目录 | 核心问题 | Agent 行为 |
|------|------|----------|-----------|
| L5 Identity | `00-Identity/` | 我是谁？ | 主动读取，更新需用户确认 |
| L4 Procedural | `01-Procedural/` | 我怎么做？ | 读取作行为参考 |
| L3 Semantic | `02-Semantic/` | 我知道什么？ | 自由读写 |
| L2 Episodic | `03-Episodic/` | 发生过什么？ | 自由写入 |
| L1 Working | `04-Working/` | 当前在做什么？ | 自由读写 |
| 输出层 | `05-Creation/` | 生成内容 | — |
| 归档层 | `06-Archive/` | 历史记录 | — |

**Identity 层文件**：核心身份卡、价值观、技能矩阵、能力轨迹、工作偏好、所属社群、关键转折点。

## Skills

### refine-knowledge（知识萃取）

从 Agent 会话中自动提炼知识，按五层架构沉淀。

- **触发方式**：`/refine-knowledge` 命令或 `Stop` hook（会话结束自动触发）
- **核心流程**：
  1. 扫描未处理的会话摘要（`04-Working/YYYY-MM-DD/agent-sessions.md`）
  2. 提炼情景记忆 → `03-Episodic/`
  3. 检测 Identity 信号（角色/能力/价值观变化）→ 提案制更新 `00-Identity/`
  4. 检测可沉淀方法 → 流向 Procedural 或 Semantic
  5. 更新各层索引

### context-loader（上下文加载）

启动新会话时自动加载相关历史经验、知识和方法。

- **触发方式**：`SessionStart` hook（会话开始自动触发）
- **核心流程**：
  1. 读取 `04-Working/active.md`（当前关注点）
  2. 读取各层索引（Episodic/Procedural/Semantic）
  3. 按任务关键词匹配，渐进式加载相关全文
  4. Token 预算控制在 ~10K-15K

## CLI 命令

| 命令 | 功能 |
|------|------|
| `second-brain-cli init-vault <vault-path>` | 创建 Vault 目录结构，生成各层索引和 Identity 模板 |
| `second-brain-cli mount-hooks` | 注册 Stop/SessionStart Hook 到 settings.json |
| `second-brain-cli queue-session` | Stop Hook 入口：接收 stdin payload 并排队 |
| `second-brain-cli inject-context` | SessionStart Hook 入口：读取并输出 vault 上下文 |

## Hook 机制

| Hook | 触发时机 | 入口命令 | 功能 |
|------|----------|----------|------|
| `Stop` | 会话结束 | `second-brain-cli queue-session` | 捕获会话摘要，后台生成并排队等待知识萃取 |
| `SessionStart` | 会话开始 | `second-brain-cli inject-context` | 注入上次会话摘要和相关上下文 |

Hooks 通过 `SKILL.md` frontmatter 声明，由 `second-brain-cli mount-hooks` 注册到 `~/.claude/settings.json`。

## 评估系统

`evals/` 目录包含对 Skills 的回归测试用例，确保知识萃取和上下文加载的准确性。详见 `evals/CLAUDE.md`。

## 设计特点

- **Skill 文档承载规则/方法论**，Vault 仅承载内容 — 不混用
- **渐进式加载**：从索引到全文，Token 预算可控，避免上下文溢出
- **提案制更新 Identity**：`00-Identity/` 的任何变更需用户明确确认
- **去重机制**：30 天内相似信号不重复，7 天内被拒绝的提案不重复
- **自动化钩子**：通过 Claude Code hooks 无感捕获会话摘要

## 技术栈

- **TypeScript** — 所有脚本使用 TypeScript 编写
- **npm CLI** — 编译后通过 bin 分发，无需 tsx 运行时
- **Vitest** — 测试框架
