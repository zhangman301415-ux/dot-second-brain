# Second Brain

基于 **Claude Code Skills** 实现的"第二大脑"知识管理系统，采用五层认知架构，构建能主动学习、沉淀知识并协助工作方法论演进的 AI 协作者。

## 安装

### npm 包（推荐）

```bash
# 全局安装
npm install -g second-brain

# 或直接 npx 运行
npx --yes second-brain mount-hooks
```

### GitHub 源码

通过 `npx skills` 从 GitHub 仓库安装：

```bash
npx skills add zhangman301415-ux/second-brain
```

安装后，Skills 会注册到 Claude Code，新会话中即可使用。

## 首次使用

安装后首次使用，Skill 会自动完成初始化：

1. **Vault 初始化** — 创建五层认知目录结构，生成索引和 Identity 模板
2. **Hook 自动注册** — 自动将 `Stop` 和 `SessionStart` hooks 注册到 `~/.claude/settings.json`

首次触发时仅会询问 vault 路径，Hook 注册无需用户确认。

默认 Vault 路径：`~/Documents/obsidian-workspace/obsidian_workspace`

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
npx --yes second-brain mount-hooks

# 初始化 Vault
npx --yes second-brain init-vault <vault-path>
```

Skill 安装后即可使用，无需额外配置：

- **`/refine-knowledge`** — 手动触发知识萃取
- 新会话自动触发上下文加载
- 会话结束自动捕获摘要并排队知识萃取

## 架构

```
.
├── skills/                         # Claude Code Skills 核心
│   ├── context-loader/             # 上下文加载 Skill
│   │   ├── SKILL.md
│   │   ├── scripts/inject-context.ts
│   │   └── references/
│   ├── refine-knowledge/           # 知识萃取 Skill
│   │   ├── SKILL.md
│   │   ├── scripts/queue-session.ts
│   │   └── references/
│   └── scripts/                    # 共享脚本
│       ├── init-vault.ts           # Vault 初始化
│       └── mount-hooks.ts          # Hook 注册
├── bin/                            # CLI 入口脚本（npm 分发）
│   ├── cli.js                      # 主 CLI: second-brain
│   ├── stop-hook.js                # second-brain-stop-hook
│   └── session-start-hook.js       # second-brain-session-start-hook
├── scripts/
│   └── copy-templates.mjs          # 构建时复制模板
├── evals/                          # 评估系统（回归测试）
├── tests/                          # 单元测试 & 集成测试
├── docs/                           # 设计文档
├── dist/                           # 编译输出（含模板）
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
| `npx --yes second-brain init-vault <vault-path>` | 创建 Vault 目录结构，生成各层索引和 Identity 模板 |
| `npx --yes second-brain mount-hooks` | 注册 Stop/SessionStart Hook 到 settings.json |
| `npx --yes second-brain-stop-hook` | Stop Hook 入口（内部调用 queue-session.js） |
| `npx --yes second-brain-session-start-hook` | SessionStart Hook 入口（内部调用 inject-context.js） |

## Hook 机制

| Hook | 触发时机 | 入口命令 | 功能 |
|------|----------|----------|------|
| `Stop` | 会话结束 | `second-brain-stop-hook` | 捕获会话摘要，后台生成并排队等待知识萃取 |
| `SessionStart` | 会话开始 | `second-brain-session-start-hook` | 注入上次会话摘要和相关上下文 |

Hooks 通过 `SKILL.md` frontmatter 声明，由 `second-brain mount-hooks` 注册到 `~/.claude/settings.json`。

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
