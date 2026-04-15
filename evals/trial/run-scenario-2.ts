#!/usr/bin/env node
/**
 * 场景 2：context-loader 评估
 *
 * 用法: node dist/evals/trial/run-scenario-2.js
 */

import { mkdtempSync, realpathSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { createScenario2Data } from "./scenario-2-data.js";
import { spawnSync } from "child_process";

const THIS_DIR = dirname(new URL(import.meta.url).pathname);
// THIS_DIR = dist/evals/trial → go up 2 levels → dist/
const DIST_DIR = resolve(join(THIS_DIR, "..", ".."));

function main() {
  const startTime = Date.now();

  // 1. 创建临时目录
  const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "eval-scenario2-"));
  const vaultPath = join(tmpDir, "vault");

  console.log(`[场景 2] 临时目录: ${tmpDir}`);
  console.log(`[场景 2] Vault 路径: ${vaultPath}`);

  // 2. 初始化 vault
  console.log("[场景 2] 初始化 vault...");
  const initResult = spawnSync("node", [
    join(DIST_DIR, "skills/scripts/init-vault.js"),
    vaultPath,
  ], { encoding: "utf-8" });

  if (initResult.status !== 0) {
    console.error("Vault 初始化失败:", initResult.stderr);
    process.exit(1);
  }
  console.log("[场景 2] Vault 初始化完成");

  // 3. 写入测试数据（包含 active.md, episodic, procedural, semantic, identity）
  console.log("[场景 2] 写入测试数据...");
  createScenario2Data(vaultPath);
  console.log("[场景 2] 测试数据写入完成");

  // 4. 记录时间
  const duration = Date.now() - startTime;
  console.log(`[场景 2] 准备完成，耗时: ${duration}ms`);
  console.log(`[场景 2] 现在需要触发 context-loader skill 加载上下文`);
  console.log(`[场景 2] 输出目录: ${vaultPath}`);

  // 打印各层初始状态
  console.log("\n=== 初始状态 ===");
  console.log(`Active: ${vaultPath}/04-Working/active.md`);
  console.log(`Episodic index: ${vaultPath}/03-Episodic/index.md`);
  console.log(`Procedural index: ${vaultPath}/01-Procedural/index.md`);
  console.log(`Semantic index: ${vaultPath}/02-Semantic/index.md`);
  console.log(`Identity profile: ${vaultPath}/00-Identity/profile.md`);
  console.log("================\n");
  console.log("[场景 2] 等待 skill 执行后检查加载的上下文...");
}

main();
