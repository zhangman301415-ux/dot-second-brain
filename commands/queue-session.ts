#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { dirname, join } from "path";
import { homedir, tmpdir } from "os";

const COMMANDS_DIR = dirname(new URL(import.meta.url).pathname);
const PROMPT_TEMPLATE = readFileSync(
  join(COMMANDS_DIR, "..", "templates", "session-summary-template.md"),
  "utf-8"
);

const CONFIG_PATH = join(homedir(), ".claude", "second-brain", ".vault-config.json");
const DEFAULT_VAULT = `${homedir()}/Documents/SecondBrain`;

function resolveVault(): string {
  if (process.env.OBSIDIAN_VAULT_PATH) return process.env.OBSIDIAN_VAULT_PATH;
  try {
    if (existsSync(CONFIG_PATH)) {
      const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      if (config.vaultPath) return config.vaultPath;
    }
  } catch { /* ignore */ }
  return DEFAULT_VAULT;
}

const VAULT = resolveVault();
const QUEUE_DIR = join(VAULT, "06-Archive/ingest/queue");
const WORKING_DIR = join(VAULT, "04-Working");

function buildRenameScript(tmpFile: string, fallback: string): string {
  const scriptPath = join(tmpdir(), `sb-rename-${Date.now()}.js`);
  const script = `
const fs=require('fs'),p=require('path');
const f=process.argv[1],fallback=process.argv[2];
if(!fs.existsSync(f))process.exit(0);
const c=fs.readFileSync(f,'utf-8');
const m=c.match(/\\*\\*任务：\\*\\*\\s*(.+?)(?:\\n|$)/);
let s=m?m[1].trim():fallback;
s=s.replace(/[^a-zA-Z0-9\\u4e00-\\u9fff]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
if(!s)s=fallback;
fs.renameSync(f,p.join(p.dirname(f),s+'.md'));
`.trim();
  writeFileSync(scriptPath, script);
  return scriptPath;
}

let payload = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (payload += chunk));
process.stdin.on("end", () => {
  if (!payload) process.exit(0);

  let transcriptPath: string;
  let sessionId: string;

  try {
    const data = JSON.parse(payload);
    transcriptPath = data.transcript_path ?? "";
    sessionId = data.session_id ?? "";
  } catch {
    process.exit(0);
  }

  if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);
  if (!sessionId) sessionId = "unknown";

  mkdirSync(QUEUE_DIR, { recursive: true });
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const backupName = `${date}-${time}-${sessionId}.jsonl`;

  writeFileSync(join(QUEUE_DIR, backupName), readFileSync(transcriptPath));

  const workingDateDir = join(WORKING_DIR, now.toISOString().slice(0, 10));
  const sessionDir = join(workingDateDir, "agent-session");
  mkdirSync(sessionDir, { recursive: true });
  const sessionName = `refine-${sessionId.slice(0, 8)}`;
  const tmpFile = join(sessionDir, `${sessionId}.md`);
  const renameScript = buildRenameScript(tmpFile, sessionId.slice(0, 8));

  const hasSession = spawn("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" });
  hasSession.on("close", (code) => {
    if (code === 0) process.exit(0);

    const summaryPrompt = PROMPT_TEMPLATE
      .replace("{{DATE}}", date)
      .replace("{{SESSION_ID}}", sessionId);

    const cmd = `claude -p --resume '${sessionId}' --permission-mode auto '${summaryPrompt}' > '${tmpFile}' 2>/dev/null && node '${renameScript}' '${tmpFile}' '${sessionId.slice(0, 8)}' && rm -f '${renameScript}'; tmux kill-session -t '${sessionName}'`;

    const tmuxProc = spawn("tmux", ["new-session", "-d", "-s", sessionName, cmd]);
    tmuxProc.on("error", () => process.exit(0));
  });
});
