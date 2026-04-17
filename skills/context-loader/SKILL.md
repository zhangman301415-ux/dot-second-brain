---
name: context-loader
description: Agent 启动时自动发现并加载相关上下文。当新会话开始时触发，从 vault 各层加载历史经验、知识和已验证方法。
hooks:
  SessionStart:
    - matcher: ""
      hooks:
        - type: command
          command: "second-brain-cli inject-context"
---

# 上下文加载（Context Loader）

Agent 启动时通过 SessionStart hook 自动注入上次会话摘要，然后主动加载 vault 相关上下文。

## 触发时机

新会话开始时，Agent 主动执行。

## 关键规则：Vault 路径获取

**禁止**通过 `find`、`ls`、`grep` 等命令在文件系统中探索搜索 Vault。Vault 路径的唯一来源是 `~/.claude/second-brain/.vault-config.json` 中的 `vaultPath` 字段。

```bash
# 正确：直接读取配置文件
cat ~/.claude/second-brain/.vault-config.json

# 错误：四处搜索（会浪费多次工具调用）
find ~ -name ".vault-config.json"
find ~/Documents -name "04-Working"
```

## 初始化检查

激活时依次检查：

1. **`~/.claude/second-brain/.vault-config.json`** — 检查 `initialized` 是否为 `true`
2. **`~/.claude/settings.json`** — 检查 `hooks.SessionStart` 是否已注册（包含 `second-brain-cli inject-context`）

- 均已配置：正常执行上下文加载
- 任一未配置：提示用户"Second Brain 尚未完成初始化，是否现在执行？"
  - 用户确认：执行 refine-knowledge 的自动初始化流程（`second-brain-cli init-vault` + `second-brain-cli mount-hooks`）
  - 用户拒绝：跳过本次上下文加载，报告"上下文加载已跳过"

## Vault 结构

```
04-Working/active.md          ← 当前关注点
03-Episodic/index.md          ← 情景索引
02-Semantic/Areas/            ← 结构化知识
01-Procedural/index.md        ← 方法论索引
06-Archive/ingest/context/
```

## 加载策略

1. **读取 active.md** — 了解当前关注点
2. **读取各层索引** — 发现有哪些历史
3. **按任务相关性过滤** — 只加载相关的条目
4. **按需加载全文** — 相关条目全文加载，不相关的只保留标题

详细策略：
- **上下文发现**: `references/discovery.md`
- **加载策略**: `references/loading.md`

## 执行清单

```
任务进度:
- [ ] 读取 active.md（当前关注点）
- [ ] 读取各层索引（发现历史）
- [ ] 按当前任务匹配相关性
- [ ] 加载相关条目全文
- [ ] 报告加载结果
```
