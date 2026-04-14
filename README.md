# Second Brain

基于 **Claude Code Skills 机制**实现的"第二大脑"知识管理系统，采用五层认知架构，构建能主动学习、沉淀知识并协助工作方法论演进的 AI 协作者。

## 架构

```
.
├── .claude-plugin/            # npx skills 技能发现配置
│   └── marketplace.json
├── skills/                    # Claude Code Skills 核心目录
│   ├── context-loader/        # 上下文加载 Skill
│   ├── refine-knowledge/      # 知识萃取 Skill
│   └── scripts/               # 共享脚本
│       ├── init-vault.sh      # Vault 初始化
│       └── mount-hooks.sh     # Hook 挂载
├── docs/                      # 设计文档
│   └── superpowers/
│       ├── specs/             # 设计规范
│       └── plans/             # 实现计划
└── .claude/
    └── settings.local.json    # Claude Code 权限配置
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

## 安装

### 初始化

Vault 初始化由 Agent 引导式完成，首次调用 skill 时自动触发。

如需手动初始化：

```bash
# 1. 创建 vault 目录结构
bash skills/scripts/init-vault.sh <vault-path>

# 2. 挂载 Claude Code hooks
bash skills/scripts/mount-hooks.sh <skills-root>
```

默认 vault 路径：`~/Documents/obsidian-workspace/obsidian_workspace`

## Hook 机制

| Hook | 触发时机 | 功能 |
|------|----------|------|
| `Stop` | 会话结束 | 捕获会话摘要，后台生成并排队等待知识萃取 |
| `SessionStart` | 会话开始 | 注入上次会话摘要和相关上下文 |

Hooks 通过 `SKILL.md` frontmatter 声明（npx-skills-integration），无需手动配置 `settings.json`。

## 核心脚本

| 脚本 | 功能 |
|------|------|
| `skills/scripts/init-vault.sh` | 创建目录结构、生成各层索引/Identity 模板 |
| `skills/scripts/mount-hooks.sh` | 复制 hooks 到 `~/.claude/hooks/` |
| `skills/refine-knowledge/scripts/queue-session.sh` | Stop hook，后台 tmux 会话生成摘要 |
| `skills/context-loader/scripts/inject-context.sh` | SessionStart hook，注入上下文 |

## 设计特点

- **职责分离**：Skill 文档（`SKILL.md`）包含方法论和规则，Vault 纯粹承载内容
- **渐进式加载**：从索引到全文，Token 预算可控
- **提案制更新**：Identity 层变化需用户确认，避免误修改
- **去重机制**：30 天内相似信号、7 天内 rejected 信号不重复提议
- **自动化钩子**：通过 Claude Code hooks 无感捕获会话摘要
