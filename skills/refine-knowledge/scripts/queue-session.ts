#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { dirname, join } from "path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const PROMPT_TEMPLATE = readFileSync(
  join(SCRIPT_DIR, "..", "references", "session-prompt.md"),
  "utf-8"
);

const VAULT = process.env.OBSIDIAN_VAULT_PATH ?? `${process.env.HOME}/Documents/obsidian-workspace/obsidian_workspace`;
const QUEUE_DIR = join(VAULT, "06-Archive/ingest/queue");
const WORKING_DIR = join(VAULT, "04-Working");

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
  mkdirSync(workingDateDir, { recursive: true });
  const sessionName = `refine-${sessionId.slice(0, 8)}`;

  const hasSession = spawn("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" });
  hasSession.on("close", (code) => {
    if (code === 0) process.exit(0);

    const summaryPrompt = PROMPT_TEMPLATE
      .replace("{{DATE}}", date)
      .replace("{{SESSION_ID}}", sessionId);

    const cmd = `claude -p --resume '${sessionId}' --permission-mode auto '${summaryPrompt}' > '${join(workingDateDir, "agent-sessions.md")}' 2>/dev/null; tmux kill-session -t '${sessionName}'`;

    const tmuxProc = spawn("tmux", ["new-session", "-d", "-s", sessionName, cmd]);
    tmuxProc.on("error", () => process.exit(0));
  });
});
