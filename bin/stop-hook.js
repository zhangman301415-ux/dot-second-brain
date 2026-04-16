#!/usr/bin/env node
/**
 * second-brain-stop-hook — Stop Hook 入口
 *
 * 接收 Claude Code Stop Hook 通过 stdin 传入的 session payload，
 * 转发给 queue-session.js 处理。
 */
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BIN_DIR = dirname(fileURLToPath(import.meta.url));
const script = join(BIN_DIR, "..", "dist", "commands", "queue-session.js");

const child = spawn("node", [script], { stdio: ["inherit", "inherit", "inherit"] });
child.on("close", (code) => process.exit(code ?? 0));
child.on("error", () => process.exit(0));
