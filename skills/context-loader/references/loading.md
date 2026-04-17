# 加载策略（Loading Strategies）

## 渐进式加载

不是一次性加载所有上下文，而是分层渐进：

### Layer 0: 必加载（极轻量）

```
文件: 04-Working/active.md
大小: < 1KB
内容: 当前关注点
决策: 无条件加载
```

### Layer 1: 索引摘要（轻量）

```
文件: 03-Episodic/index.md, 01-Procedural/index.md
大小: 各 < 5KB
内容: 索引表格（标题+关键词，不含全文）
决策: 按任务关键词过滤，列出相关条目
```

### Layer 2: 相关全文（按需）

```
文件: 匹配到的具体 Episodic/Procedural 文件
大小: 各 1-5KB
决策: 用户确认后加载，或 Agent 判断高度相关时自主加载
```

## Token 预算

| 层级 | 预估 Token | 说明 |
|------|-----------|------|
| Layer 0 | ~200 | active.md 全文 |
| Layer 1 | ~1000 | 索引表格，过滤后 |
| Layer 2 | ~3000/条 | 最多加载 3-5 条相关全文 |
| 总计 | ~10K-15K | 可控 |

## 加载指令

```
# 读取索引后，按相关性排序
1. 高相关（关键词+场景都匹配） → 自动加载全文
2. 中相关（仅关键词匹配） → 列出标题，询问用户
3. 低相关（标签匹配） → 仅列在报告末尾
```

## SessionStart Hook（可选）

对于 Claude Code，SessionStart hook 可作为备用入口：

```bash
#!/usr/bin/env bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/SecondBrain}"
CONTEXT="$VAULT/06-Archive/ingest/context/latest.md"

[ -f "$CONTEXT" ] && cat "$CONTEXT"
exit 0
```

**注意**：hook 不是必须的，Agent 也可以不依赖 hook 自主执行加载流程。
