#!/usr/bin/env python3
"""生成 context-loader 鲁棒性 200 条测试用例。"""

import json
import os

OUTPUT_FILE = "evals/context-loader/robustness.jsonl"
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

cases = []
cid = 0

def add(prompt, scenario, vault, expected, criteria, tags, cfg=True, hook="mounted"):
    global cid
    cid += 1
    setup = {"vault_structure": vault, "vault_config_exists": cfg, "hook_status": hook}
    cases.append({
        "id": f"CL-ROBUST-{cid:04d}",
        "dimension": "鲁棒性",
        "skill": "context-loader",
        "prompt": prompt,
        "scenario": scenario,
        "setup": setup,
        "expected_output": expected,
        "evaluation": {"criteria": criteria, "type": "assertion" if len(criteria) >= 3 else "llm_judge"},
        "tags": tags,
    })

P = ["加载上下文", "读取 vault", "新会话开始，请加载上下文",
     "帮我加载上下文", "启动时加载 vault", "加载 context",
     "请先加载我的 Second Brain 上下文", "context-loader 启动",
     "load my vault please", "读取状态"]

EPISODIC_OK = "## 2026-04\n- [测试](test.md)"

# === 变体 1: 文件缺失 (30 条) ===
missing_files = [
    ("active.md 缺失", {"04-Working/active.md": "__M__"}),
    ("Episodic 索引缺失", {"03-Episodic/index.md": "__M__"}),
    ("Procedural 索引缺失", {"01-Procedural/index.md": "__M__"}),
    ("Semantic 索引缺失", {"02-Semantic/index.md": "__M__"}),
    ("active.md + Episodic 同时缺失", {"04-Working/active.md": "__M__", "03-Episodic/index.md": "__M__"}),
    ("所有索引缺失", {"03-Episodic/index.md": "__M__", "01-Procedural/index.md": "__M__", "02-Semantic/index.md": "__M__"}),
    ("vault 根目录不存在", {}),
]
for i in range(30):
    desc, m = missing_files[i % len(missing_files)]
    vault = {}
    for k, v in m.items():
        if v != "__M__":
            vault[k] = v
    scenario = f"{desc} (变体 {i})"
    expected = "agent 应检测缺失文件，跳过加载或提示"
    criteria = ["检测到文件缺失", "跳过了缺失文件的加载", "未崩溃或报错"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["missing", "robustness", "basic"])

# === 变体 2: 配置异常 (25 条) ===
cfg_variants = [
    ("JSON 格式错误", '{"invalid": }'),
    ("字段缺失", '{"vaultPath": "/test"}'),  # 缺少 initialized
    ("字段类型错误", '{"initialized": "true"}'),  # 字符串而非布尔
    ("旧版本格式", '{"version": 1, "path": "/test"}'),
    ("空文件", ""),
    ("只有空对象", "{}"),
    ("null 值", '{"initialized": null, "vaultPath": null}'),
    ("数组而非对象", '[{"key": "value"}]'),
    ("编码错误", '{"vaultPath": "\\xff\\xfe"}'),
    ("超大配置", '{"vaultPath": "' + "A" * 10000 + '"}'),
]
for i in range(25):
    desc, content = cfg_variants[i % len(cfg_variants)]
    scenario = f"配置{desc} (变体 {i})"
    expected = "agent 应检测配置异常，提示修复或重新初始化"
    criteria = ["检测到配置异常", "未崩溃", "给出了修复建议或跳过"]
    vault = {"04-Working/active.md": "# 测试\n\n- 任务"}
    add(P[i % len(P)], scenario, vault, expected, criteria, ["corrupt", "robustness", "basic"], cfg=True)

# === 变体 3: 空 vault (15 条) ===
for i in range(15):
    scenario = f"空 vault：目录存在但无文件 (变体 {i})"
    vault = {"04-Working/": {}, "03-Episodic/": {}, "01-Procedural/": {}}
    expected = "agent 应报告 vault 为空"
    criteria = ["识别到 vault 为空", "未尝试加载空内容", "报告了空状态"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["empty", "robustness", "basic"])

# === 变体 4: 损坏文件 (20 条) ===
damaged = [
    ("截断的 JSON", '{"incomplete'),
    ("乱码", "\x00\x01\x02binary content"),
    ("非 UTF-8", "binary\xfe\xff"),
    ("只有空行", "\n\n\n\n"),
    ("重复内容", "line1\nline1\nline1\n" * 100),
    ("HTML 而非 Markdown", "<html><body>content</body></html>"),
    ("YAML 而非 Markdown", "key: value\nnested:\n  - item"),
    ("代码文件", "#!/bin/bash\necho hello"),
]
for i in range(20):
    desc, content = damaged[i % len(damaged)]
    vault = {"04-Working/active.md": content, "03-Episodic/index.md": EPISODIC_OK}
    scenario = f"文件内容{desc} (变体 {i})"
    expected = "agent 应检测内容异常，尝试解析或跳过"
    criteria = ["检测到内容异常", "尝试解析或跳过", "未崩溃"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["corrupt", "robustness", "basic"])

EPISODIC_OK = "## 2026-04\n- [测试](test.md)"

# === 变体 5: 权限问题 (15 条) ===
for i in range(15):
    perms = ["只读", "无读权限", "无写权限", "无执行权限", "属主不同"][i % 5]
    scenario = f"文件{perms} (变体 {i})"
    vault = {"04-Working/active.md": "# 权限测试\n\n- 测试", "03-Episodic/index.md": EPISODIC_OK}
    expected = "agent 应处理权限问题，报告或跳过"
    criteria = ["检测到权限问题", "未崩溃", "报告了权限错误"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["permissions", "robustness", "basic"])

# === 变体 6: hook 异常 (20 条) ===
hook_variants = [
    ("hook 未挂载", "unmounted"),
    ("hook 命令错误", "error"),
    ("hook 超时", "timeout"),
    ("hook 返回空", "empty"),
    ("hook 返回非 JSON", "invalid"),
]
for i in range(20):
    desc, status = hook_variants[i % len(hook_variants)]
    scenario = f"hook {desc} (变体 {i})"
    vault = {"04-Working/active.md": "# 测试\n\n- hook 测试"}
    expected = "agent 应处理 hook 异常，尝试替代方法"
    criteria = ["检测到 hook 异常", "尝试了替代方法", "未因 hook 崩溃"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["hook-fail", "robustness", "basic"], hook=status)

# === 变体 7: 大输入 (20 条) ===
for i in range(20):
    if i < 7:
        file_count = [1000, 5000, 10000][i % 3]
        scenario = f"大 vault：{file_count} 文件 (变体 {i})"
        vault = {"04-Working/active.md": "# 大 vault\n\n- 测试"}
        expected = "agent 应按需加载，不全部读取"
        criteria = ["按需加载", "未全部读取", "token 消耗合理"]
    elif i < 14:
        size = [100000, 500000, 1000000][i % 3]
        scenario = f"大索引：{size} 字符 (变体 {i})"
        vault = {"04-Working/active.md": "# 测试", "03-Episodic/index.md": "A" * min(size, 50000)}
        expected = "agent 应处理大索引，按需加载"
        criteria = ["未一次性加载大索引", "按需读取", "未崩溃"]
    else:
        depth = [5, 10, 20][i % 3]
        scenario = f"深层嵌套：{depth} 层 (变体 {i})"
        path = "/".join(f"level{j}" for j in range(depth))
        vault = {"04-Working/active.md": "# 深层", "03-Episodic/index.md": f"- [测试]({path}/test.md)"}
        expected = "agent 应处理深层嵌套"
        criteria = ["正确解析了嵌套路径", "按需加载", "未崩溃"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["large", "robustness", "basic"])

# === 变体 8: 并发 (15 条) ===
for i in range(15):
    conc = ["同时初始化+加载", "多个 session 同时加载", "加载中被中断"][i % 3]
    scenario = f"并发操作：{conc} (变体 {i})"
    vault = {"04-Working/active.md": "# 并发\n\n- 测试"}
    expected = "agent 应处理并发安全"
    criteria = ["未因并发导致数据损坏", "正确处理了竞争条件", "未崩溃"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["concurrent", "robustness", "basic"])

# === 变体 9: 环境差异 (20 条) ===
envs = [
    ("macOS 特殊路径", {"04-Working/active.md": "# 路径测试\n\n- 中文路径"}),
    ("空格路径", {"04-Working/active.md": "# 空格\n\n- 测试"}),
    ("符号链接", {"04-Working/active.md": "# symlink\n\n- 测试"}),
    ("远程路径", {"04-Working/active.md": "# remote\n\n- 测试"}),
    ("相对路径", {"04-Working/active.md": "# relative\n\n- 测试"}),
]
for i in range(20):
    desc, vault = envs[i % len(envs)]
    scenario = f"环境差异：{desc} (变体 {i})"
    expected = "agent 应处理环境差异"
    criteria = ["未因环境差异崩溃", "正确处理了路径", "报告了加载结果"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["environment", "robustness", "basic"])

# === 变体 10: 综合异常 (20 条) ===
for i in range(20):
    if i < 5:
        scenario = f"配置缺失 + active.md 损坏 (变体 {i})"
        vault = {"04-Working/active.md": "\x00\x01损坏"}
        expected = "agent 应处理多异常"
        criteria = ["检测到配置缺失", "检测到内容损坏", "提示了用户"]
    elif i < 10:
        scenario = f"大 vault + 部分文件损坏 (变体 {i})"
        vault = {"04-Working/active.md": "# 大 vault\n\n" + "- 任务\n" * 100, "03-Episodic/index.md": "\x00损坏"}
        expected = "agent 应处理部分损坏"
        criteria = ["加载了未损坏的文件", "跳过了损坏文件", "报告了损坏"]
    elif i < 15:
        scenario = f"权限 + 并发 (变体 {i})"
        vault = {"04-Working/active.md": "# 权限\n\n- 测试"}
        expected = "agent 应处理复合问题"
        criteria = ["检测到权限问题", "处理了并发", "未崩溃"]
    else:
        scenario = f"空配置 + 大 vault (变体 {i})"
        vault = {"04-Working/active.md": "# 大\n\n" + "- 任务\n" * 200}
        expected = "agent 应处理空配置和大文件"
        criteria = ["处理了空配置", "按需加载大文件", "未崩溃"]
    add(P[i % len(P)], scenario, vault, expected, criteria, ["composite", "robustness", "basic"])

# === 写入 ===
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    for c in cases:
        f.write(json.dumps(c, ensure_ascii=False) + "\n")

print(f"Generated {len(cases)} test cases -> {OUTPUT_FILE}")
