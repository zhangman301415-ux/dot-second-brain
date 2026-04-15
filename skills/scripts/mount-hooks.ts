#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, chmodSync } from "fs";
import { join } from "path";

const SKILLS_ROOT = process.argv[2] ?? "";
if (!SKILLS_ROOT) {
  process.stderr.write("错误: 请提供 skills 根目录路径\n");
  process.stderr.write("用法: node mount-hooks.js <skills-root>\n");
  process.exit(1);
}

const hooksDir = join(process.env.HOME!, ".claude", "hooks");
mkdirSync(hooksDir, { recursive: true });

const refineScript = join(SKILLS_ROOT, "refine-knowledge/scripts/queue-session.sh");
const loaderScript = join(SKILLS_ROOT, "context-loader/scripts/inject-context.sh");

let hooksOk = true;

if (existsSync(refineScript)) {
  copyFileSync(refineScript, join(hooksDir, "queue-session.sh"));
  chmodSync(join(hooksDir, "queue-session.sh"), 0o755);
} else {
  process.stderr.write(`错误: 未找到 ${refineScript}\n`);
  hooksOk = false;
}

if (existsSync(loaderScript)) {
  copyFileSync(loaderScript, join(hooksDir, "inject-context.sh"));
  chmodSync(join(hooksDir, "inject-context.sh"), 0o755);
} else {
  process.stderr.write(`错误: 未找到 ${loaderScript}\n`);
  hooksOk = false;
}

if (!hooksOk) {
  process.stderr.write("错误: hook 源脚本缺失，跳过 settings.json 更新\n");
  process.exit(2);
}

// Update settings.json
const settingsPath = join(process.env.HOME!, ".claude", "settings.json");
let settings: Record<string, unknown> = { hooks: {} };
if (existsSync(settingsPath)) {
  settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
}

const hooks = (settings.hooks = (settings.hooks ?? {}) as Record<string, unknown>);

const stopHook = {
  matcher: "",
  hooks: [{ type: "command", command: "bash ~/.claude/hooks/queue-session.sh" }],
};
const sessionStartHook = {
  matcher: "",
  hooks: [{ type: "command", command: "bash ~/.claude/hooks/inject-context.sh" }],
};

const existingStop = ((hooks["Stop"] as unknown[]) ?? []).filter(
  (h: any) => !JSON.stringify(h).includes("queue-session")
);
const existingStart = ((hooks["SessionStart"] as unknown[]) ?? []).filter(
  (h: any) => !JSON.stringify(h).includes("inject-context")
);

hooks["Stop"] = [...existingStop, stopHook];
hooks["SessionStart"] = [...existingStart, sessionStartHook];

writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

// Update .vault-config.json
const configPath = join(SKILLS_ROOT, ".vault-config.json");
if (existsSync(configPath)) {
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  config["hooksMounted"] = true;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

process.exit(0);
