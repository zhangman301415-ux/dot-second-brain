/**
 * LLM 断言评分器
 *
 * 根据 vault diff、文件内容和断言定义，调用 LLM 对每个测试用例进行 PASS/FAIL 评分。
 * 使用 DashScope 兼容的 OpenAI API（qwen-max 模型）。
 */

import OpenAI from "openai";
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

  const client = new OpenAI({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });

  const response = await client.chat.completions.create({
    model: "qwen-max",
    max_tokens: 4000,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content || "{}";
  return parseGradingResponse(text, assertions);
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
 * 构建 LLM 评分提示词
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

## 输出格式

请只输出一个 JSON 对象，不要包含其他内容：

{
  "assertion_results": [
    {"text": "断言原文", "passed": true, "evidence": "具体证据"},
    ...
  ]
}`;
}

/**
 * 解析 LLM 返回的评分响应
 */
function parseGradingResponse(text: string, assertions: string[]): GradingResult {
  // Extract JSON
  let jsonText = text.trim();
  const jsonMatch = text.match(/```\s*json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  // Also try to find JSON block without markdown
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch && !jsonText.startsWith("{")) {
    jsonText = braceMatch[0];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    // Fallback: all assertions fail
    console.error("LLM 返回无法解析为 JSON:", jsonText.slice(0, 200));
    const results: AssertionResult[] = assertions.map(a => ({
      text: a,
      passed: false,
      evidence: "LLM 返回格式错误，无法解析",
    }));
    return makeGradingResult(results);
  }

  const results: AssertionResult[] = parsed.assertion_results || [];

  // Ensure all assertions have results
  for (let i = 0; i < assertions.length; i++) {
    if (!results[i]) {
      results.push({
        text: assertions[i],
        passed: false,
        evidence: "LLM 未返回该断言的评分结果",
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
