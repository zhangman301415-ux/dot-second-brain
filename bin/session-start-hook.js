#!/usr/bin/env node
/**
 * second-brain-session-start-hook — SessionStart Hook 入口
 *
 * 直接调用 inject-context.js，读取 vault 上下文并输出到 stdout。
 */
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BIN_DIR = dirname(fileURLToPath(import.meta.url));
const script = join(BIN_DIR, "..", "dist", "commands", "inject-context.js");

const child = spawn("node", [script], { stdio: ["inherit", "inherit", "inherit"] });
child.on("close", (code) => process.exit(code ?? 0));
child.on("error", () => process.exit(0));
