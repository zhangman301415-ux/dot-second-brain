#!/usr/bin/env node
/**
 * 挂载 Stop / SessionStart Hook 到 ~/.claude/settings.json
 *
 * npm 模式：直接写入 npx 命令，不需要复制脚本文件。
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const settingsPath = join(process.env.HOME!, ".claude", "settings.json");
let settings: Record<string, unknown> = existsSync(settingsPath)
  ? JSON.parse(readFileSync(settingsPath, "utf-8"))
  : {};

const hooks = (settings.hooks = (settings.hooks ?? {}) as Record<string, unknown>);

// Remove existing second-brain hooks to avoid duplicates
const existingStop = ((hooks["Stop"] as unknown[]) ?? []).filter(
  (h: any) => !JSON.stringify(h).includes("second-brain")
);
const existingStart = ((hooks["SessionStart"] as unknown[]) ?? []).filter(
  (h: any) => !JSON.stringify(h).includes("second-brain")
);

hooks["Stop"] = [
  ...existingStop,
  {
    matcher: "",
    hooks: [{ type: "command", command: "second-brain-cli queue-session" }],
  },
];
hooks["SessionStart"] = [
  ...existingStart,
  {
    matcher: "",
    hooks: [{ type: "command", command: "second-brain-cli inject-context" }],
  },
];

writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

process.exit(0);
