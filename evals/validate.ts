import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OUTPUT_FILES: Record<string, string> = {
  "功能正确性": "functionality.jsonl",
  "鲁棒性": "robustness.jsonl",
  "指令清晰度": "clarity.jsonl",
  "隔离性": "isolation.jsonl",
  "幂等性": "idempotency.jsonl",
  "性能开销": "performance.jsonl",
  "知识完整性": "knowledge-integrity.jsonl",
};

const REQUIRED_TAGS: Record<string, string[]> = {
  "功能正确性": ["basic", "edge"],
  "鲁棒性": ["missing", "corrupt", "empty"],
  "指令清晰度": ["vague", "ambiguous", "standard"],
  "隔离性": ["settings", "vault", "hooks"],
  "幂等性": ["repeat-2", "repeat-3", "interrupted"],
  "性能开销": ["small", "medium", "large"],
  "知识完整性": ["decision", "method", "identity", "lesson"],
};

function readJsonl(filepath: string): { cases: Record<string, unknown>[]; parseErrors: string[] } {
  const cases: Record<string, unknown>[] = [];
  const parseErrors: string[] = [];
  const content = readFileSync(filepath, "utf-8");
  for (const [idx, line] of content.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { cases.push(JSON.parse(trimmed)); } catch (e) { parseErrors.push(`行 ${idx + 1}: JSON 解析错误: ${e}`); }
  }
  return { cases, parseErrors };
}

function checkDuplicates(filepath: string): string[] {
  const { cases, parseErrors } = readJsonl(filepath);
  const errors = [...parseErrors];
  const seen = new Map<string, string>();
  for (const c of cases) {
    const key = JSON.stringify({ p: c.prompt ?? "", s: c.setup ?? {} });
    if (seen.has(key)) errors.push(`重复用例: ${c.id} 与 ${seen.get(key)}`);
    else seen.set(key, (c as { id: string }).id);
  }
  return errors;
}

function checkCoverage(filepath: string, dimension: string): string[] {
  const { cases, parseErrors } = readJsonl(filepath);
  const errors = [...parseErrors];
  const tags = new Set<string>();
  for (const c of cases) {
    if (Array.isArray(c.tags)) for (const t of c.tags) tags.add(t as string);
  }
  for (const tag of REQUIRED_TAGS[dimension] ?? []) {
    if (!tags.has(tag)) errors.push(`缺少标签覆盖: ${tag}`);
  }
  return errors;
}

function checkScoring(filepath: string): string[] {
  const { cases, parseErrors } = readJsonl(filepath);
  const errors = [...parseErrors];
  for (const c of cases) {
    const eval_ = (c as any).evaluation;
    const criteria = eval_?.criteria;
    if (!criteria || (Array.isArray(criteria) && criteria.length === 0)) errors.push(`${(c as { id: string }).id}: 无评分标准`);
  }
  return errors;
}

function validate(skill: string, dimension: string): number {
  const dimFile = OUTPUT_FILES[dimension];
  const filepath = join(__dirname, skill, dimFile);
  if (!existsSync(filepath)) { console.log(`文件不存在: ${filepath}`); return 1; }
  const errors = [...checkDuplicates(filepath), ...checkCoverage(filepath, dimension), ...checkScoring(filepath)];
  if (errors.length > 0) {
    console.log(`${skill}/${dimension}: ${errors.length} 个问题`);
    for (const err of errors) console.log(`  ${err}`);
  } else {
    console.log(`${skill}/${dimension}: 验证通过`);
  }
  return errors.length;
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--all") {
  let total = 0;
  const commonDims = ["功能正确性", "鲁棒性", "指令清晰度", "隔离性", "幂等性", "性能开销"];
  for (const skill of ["context-loader", "refine-knowledge"]) {
    const dims = [...commonDims, ...(skill === "refine-knowledge" ? ["知识完整性"] : [])];
    for (const dim of dims) total += validate(skill, dim);
  }
  process.exit(total > 0 ? 1 : 0);
} else if (args.length === 2) {
  process.exit(validate(args[0], args[1]));
} else {
  console.log(`深度验证脚本：检查重复、覆盖度、可评分性。

Usage:
    npx tsx evals/validate.ts <skill> <dimension>
    npx tsx evals/validate.ts --all`);
  process.exit(1);
}
