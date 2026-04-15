import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from "fs";
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

interface EvalCase {
  id: string;
  dimension: string;
  skill: string;
  prompt: string;
  scenario: string;
  setup: Record<string, unknown>;
  expected_output: string;
  evaluation: { criteria: string[]; type: "assertion" | "llm_judge" };
  tags: string[];
}

export function validateCaseFn(case_: EvalCase): string[] {
  const errors: string[] = [];
  const required = ["id", "dimension", "skill", "prompt", "scenario", "setup", "expected_output", "evaluation", "tags"];
  for (const field of required) {
    if (!(field in case_)) errors.push(`缺少必填字段: ${field}`);
  }
  if ("id" in case_) {
    const parts = (case_ as { id: string }).id.split("-");
    if (parts.length !== 3) errors.push(`ID 格式错误: ${(case_ as { id: string }).id}，应为 SKILL-DIM-NNNN`);
  }
  if ("evaluation" in case_) {
    const ev = (case_ as EvalCase).evaluation;
    if (!("criteria" in ev)) errors.push("evaluation.criteria 缺失");
    else if (!Array.isArray(ev.criteria)) errors.push("evaluation.criteria 应为列表");
    if (!("type" in ev)) errors.push("evaluation.type 缺失");
    else if (!["assertion", "llm_judge"].includes(ev.type)) errors.push(`evaluation.type 非法: ${ev.type}`);
  }
  if ("tags" in case_ && !Array.isArray((case_ as EvalCase).tags)) errors.push("tags 应为列表");
  return errors;
}

export function validateFile(filepath: string): { stats: { total: number; valid: number; errors_count: number }; errors: string[] } {
  const stats = { total: 0, valid: 0, errors_count: 0 };
  const errors: string[] = [];
  const seenIds = new Set<string>();
  if (!existsSync(filepath)) return { stats, errors: [`文件不存在: ${filepath}`] };

  const content = readFileSync(filepath, "utf-8");
  for (const [idx, line] of content.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    stats.total++;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(trimmed); } catch (e) { errors.push(`行 ${idx + 1}: JSON 解析错误: ${e}`); continue; }
    const ve = validateCaseFn(parsed as EvalCase);
    if (ve.length > 0) { for (const err of ve) errors.push(`行 ${idx + 1}: ${err}`); continue; }
    stats.valid++;
    if ("id" in parsed) {
      const id = (parsed as { id: string }).id;
      if (seenIds.has(id)) errors.push(`行 ${idx + 1}: 重复 ID: ${id}`);
      seenIds.add(id);
    }
  }
  stats.errors_count = errors.length;
  return { stats, errors };
}

export function buildEvalsIndex(): void {
  const index: { generated_at: string; evals: Array<{ file: string; skill: string; count: number }>; total?: number } = { generated_at: new Date().toISOString(), evals: [] };
  for (const skillDir of ["context-loader", "refine-knowledge"]) {
    const skillPath = join(__dirname, skillDir);
    if (!existsSync(skillPath) || !statSync(skillPath).isDirectory()) continue;
    for (const filename of readdirSync(skillPath).sort()) {
      if (!filename.endsWith(".jsonl")) continue;
      const content = readFileSync(join(skillPath, filename), "utf-8");
      const count = content.split("\n").filter((l) => l.trim()).length;
      index.evals.push({ file: `${skillDir}/${filename}`, skill: skillDir, count });
    }
  }
  index.total = index.evals.reduce((s, e) => s + e.count, 0);
  const output = join(__dirname, "evals.json");
  writeFileSync(output, JSON.stringify(index, null, 2), "utf-8");
  console.log(`索引已写入: ${output} (共 ${index.total} 条用例)`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`测试用例验证器和索引生成器。\n\nUsage:\n    npx tsx evals/generate.ts --validate`);
  process.exit(1);
}
if (args[0] === "--validate") {
  let totalErrors = 0;
  for (const skillDir of ["context-loader", "refine-knowledge"]) {
    const skillPath = join(__dirname, skillDir);
    if (!existsSync(skillPath) || !statSync(skillPath).isDirectory()) continue;
    for (const filename of readdirSync(skillPath).sort()) {
      if (!filename.endsWith(".jsonl")) continue;
      const { stats, errors } = validateFile(join(skillPath, filename));
      console.log(`${skillDir}/${filename}: ${stats.total} 条, ${stats.valid} 有效, ${stats.errors_count} 错误`);
      for (const err of errors) { console.log(`  ${err}`); totalErrors++; }
    }
  }
  console.log(totalErrors === 0 ? "所有验证通过" : `共 ${totalErrors} 个错误`);
  buildEvalsIndex();
  process.exit(totalErrors > 0 ? 1 : 0);
}
