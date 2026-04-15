#!/usr/bin/env node
/**
 * 场景 1：refine-knowledge 评估
 *
 * 用法: node dist/evals/trial/run-scenario-1.js
 */

import { mkdtempSync, realpathSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { createScenario1Data } from "./scenario-1-data.js";
import { spawnSync } from "child_process";

const THIS_DIR = dirname(new URL(import.meta.url).pathname);
// THIS_DIR = dist/evals/trial → go up 2 levels → dist/
const DIST_DIR = resolve(join(THIS_DIR, "..", ".."));

function main() {
  const startTime = Date.now();

  // 1. 创建临时目录
  const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "eval-scenario1-"));
  const vaultPath = join(tmpDir, "vault");

  console.log(`[场景 1] 临时目录: ${tmpDir}`);
  console.log(`[场景 1] Vault 路径: ${vaultPath}`);

  // 2. 初始化 vault
  console.log("[场景 1] 初始化 vault...");
  const initResult = spawnSync("node", [
    join(DIST_DIR, "skills/scripts/init-vault.js"),
    vaultPath,
  ], { encoding: "utf-8" });

  if (initResult.status !== 0) {
    console.error("Vault 初始化失败:", initResult.stderr);
    process.exit(1);
  }
  console.log("[场景 1] Vault 初始化完成");

  // 3. 写入模拟会话数据
  console.log("[场景 1] 写入模拟会话数据...");
  const data = createScenario1Data(vaultPath);
  console.log(`[场景 1] 会话文件: ${data.sessionFilePath}`);

  // 4. 记录 token 和时间（由调用方/子 agent 提供）
  const duration = Date.now() - startTime;
  console.log(`[场景 1] 准备完成，耗时: ${duration}ms`);
  console.log(`[场景 1] 现在需要触发 refine-knowledge skill 处理 ${data.sessionFilePath}`);
  console.log(`[场景 1] 输出目录: ${vaultPath}`);

  // 打印各层初始状态（用于对比）
  console.log("\n=== 初始状态 ===");
  console.log(`Episodic index: ${vaultPath}/03-Episodic/index.md`);
  console.log(`Procedural index: ${vaultPath}/01-Procedural/index.md`);
  console.log(`Semantic index: ${vaultPath}/02-Semantic/index.md`);
  console.log("================\n");
  console.log("[场景 1] 等待 skill 执行后检查输出...");
}

main();
