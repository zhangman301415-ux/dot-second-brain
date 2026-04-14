---
name: context-loader
description: Agent 启动时自动发现并加载相关上下文。当新会话开始时触发，从 vault 各层加载历史经验、知识和已验证方法。
---

# 上下文加载（Context Loader）

Agent 启动时自动加载相关上下文，不依赖外部 hook。

## 触发时机

新会话开始时，Agent 主动执行。

## 初始化检查

激活时检查 skills 根目录下的 `.vault-config.json`。
- 如果文件存在且 `initialized` 为 `true`：正常执行上下文加载
- 否则：提示用户"Second Brain vault 尚未初始化，是否现在执行初始化？"
  - 用户确认：按 refine-knowledge 的初始化流程执行（`../scripts/init-vault.sh` + `../scripts/mount-hooks.sh`）
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
