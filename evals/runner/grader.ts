/**
 * LLM 断言评分器
 *
 * 根据 vault diff、文件内容和断言定义，启动 Claude Code 会话对每个
 * 测试用例进行 PASS/FAIL 评分。评分过程可访问 vault 文件进行验证。
 */

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { VaultDiff } from "./vault-snapshot.js";

export interface AssertionResult {
  text: string;
  passed: boolean;
  evidence: string;
}

export interface GradingResult {
  assertion_results: AssertionResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    pass_rate: number;
  };
}

/**
 * 对单个测试用例进行 LLM 评分
 */
export async function gradeEval(
  assertions: string[],
  vaultDiff: VaultDiff,
  initialVaultPath: string,
  finalVaultPath: string
): Promise<GradingResult> {
  const evidence = buildEvidence(vaultDiff, initialVaultPath, finalVaultPath);
  const prompt = buildGradingPrompt(assertions, vaultDiff, evidence);

  return runClaudeGrading(prompt, initialVaultPath, finalVaultPath, assertions);
}

/**
 * 从 vault diff 中收集评分证据
 */
function buildEvidence(
  diff: VaultDiff,
  initialPath: string,
  finalPath: string
): string {
  const lines: string[] = [];

  for (const f of diff.added) {
    const fullPath = join(finalPath, f);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      lines.push(`=== ADDED: ${f} ===`);
      lines.push(content.length > 3000 ? content.slice(0, 3000) + "\n... (truncated)" : content);
      lines.push("");
    }
  }

  for (const f of diff.modified) {
    const fullPath = join(finalPath, f);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      lines.push(`=== MODIFIED: ${f} ===`);
      lines.push(content.length > 3000 ? content.slice(0, 3000) + "\n... (truncated)" : content);
      lines.push("");
    }
  }

  for (const f of diff.deleted) {
    lines.push(`=== DELETED: ${f} ===`);
  }

  return lines.join("\n");
}

/**
 * 构建 Claude Code 评分提示词
 */
function buildGradingPrompt(
  assertions: string[],
  diff: VaultDiff,
  evidence: string
): string {
  const diffSummary = [
    `新增文件 (${diff.added.length}): ${diff.added.join(", ") || "(无)"}`,
    `修改文件 (${diff.modified.length}): ${diff.modified.join(", ") || "(无)"}`,
    `删除文件 (${diff.deleted.length}): ${diff.deleted.join(", ") || "(无)"}`,
  ].join("\n");

  return `你是一个知识管理系统的质量评估员。请根据以下信息评估测试结果。

## Vault 变更摘要

${diffSummary}

## 实际文件内容

${evidence || "(无新增或修改的文件)"}

## 断言列表

请逐条评估以下断言是否成立：

${assertions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## 评分规则

- **PASS**：断言明确成立，有具体证据支持
- **FAIL**：断言不成立，或证据不足
- 每条断言必须给出 **passed**（true/false）和 **evidence**（引用具体文件或内容作为证据）
- 证据必须引用实际观察到的内容，不能只说"根据输出判断"
- 你可以使用 Read 工具直接查看 vault 文件内容来验证断言

## 输出格式

请只输出一个 JSON 对象，不要包含任何其他文字或解释：

{
  "assertion_results": [
    {"text": "断言原文", "passed": true, "evidence": "具体证据"},
    ...
  ]
}`;
}

/**
 * 启动 Claude Code 会话执行评分
 */
async function runClaudeGrading(
  prompt: string,
  initialVaultPath: string,
  finalVaultPath: string,
  assertions: string[]
): Promise<GradingResult> {
  return new Promise((resolve) => {
    const args = [
      "-p",
      "--json-schema", JSON.stringify(GRADING_SCHEMA),
      "--add-dir", initialVaultPath,
      "--add-dir", finalVaultPath,
      "--allowed-tools", "Read,Bash",
    ];

    let stdout = "";
    let stderr = "";

    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300000, // 5 分钟超时
    });

    child.on("error", (err) => {
      console.error("Claude Code 启动失败:", err.message);
      resolve(makeFallbackResult(assertions));
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // 写入 prompt 到 stdin
    child.stdin.write(prompt);
    child.stdin.end();

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`Claude Code 评分失败 (exit ${code})`);
        if (stderr) console.error("stderr:", stderr.slice(0, 500));
        resolve(makeFallbackResult(assertions));
        return;
      }

      if (!stdout.trim()) {
        console.error("Claude Code 返回空输出");
        resolve(makeFallbackResult(assertions));
        return;
      }

      const result = parseGradingResponse(stdout, assertions);
      resolve(result);
    });
  });
}

const GRADING_SCHEMA = {
  type: "object",
  properties: {
    assertion_results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          passed: { type: "boolean" },
          evidence: { type: "string" },
        },
        required: ["text", "passed", "evidence"],
      },
    },
  },
  required: ["assertion_results"],
};

/**
 * 解析 Claude 返回的评分响应
 */
function parseGradingResponse(text: string, assertions: string[]): GradingResult {
  let jsonText = text.trim();

  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```\s*json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  // Also try to find raw JSON block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch && !jsonText.startsWith("{")) {
    jsonText = braceMatch[0];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error("Claude 返回无法解析为 JSON:", jsonText.slice(0, 200));
    return makeFallbackResult(assertions);
  }

  const results: AssertionResult[] = parsed.assertion_results || [];

  // Ensure all assertions have results
  for (let i = 0; i < assertions.length; i++) {
    if (!results[i]) {
      results.push({
        text: assertions[i],
        passed: false,
        evidence: "Claude 未返回该断言的评分结果",
      });
    }
  }

  return makeGradingResult(results);
}

function makeGradingResult(results: AssertionResult[]): GradingResult {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return {
    assertion_results: results,
    summary: {
      passed,
      failed,
      total: results.length,
      pass_rate: results.length > 0 ? passed / results.length : 0,
    },
  };
}

function makeFallbackResult(assertions: string[]): GradingResult {
  return makeGradingResult(
    assertions.map(a => ({
      text: a,
      passed: false,
      evidence: "Claude Code 评分执行失败",
    }))
  );
}
