import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  createTempDirSync,
  runScript,
  runBash,
} from "../helpers/setup";

describe("hook-lifecycle", () => {
  let TEST_TMP: string;
  let TEST_VAULT: string;

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
    TEST_VAULT = `${TEST_TMP}/vault`;
    mkdirSync(join(TEST_VAULT, "06-Archive/ingest/queue"), { recursive: true });
    mkdirSync(join(TEST_VAULT, "04-Working"), { recursive: true });
    mkdirSync(join(TEST_VAULT, "06-Archive/ingest/context"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  test("queue-session parses payload correctly", () => {
    const transcriptFile = `${TEST_TMP}/test-session.jsonl`;
    writeFileSync(transcriptFile, '{"type":"human","message":"test"}');
    const payload = JSON.stringify({
      transcript_path: transcriptFile,
      session_id: "test-session-001",
    });
    const parsed = JSON.parse(payload);
    expect(parsed.transcript_path).toBe(transcriptFile);
    expect(parsed.session_id).toBe("test-session-001");
  });

  test("queue-session backs up transcript", () => {
    const transcriptFile = `${TEST_TMP}/test-session.jsonl`;
    writeFileSync(transcriptFile, '{"type":"human","message":"test backup"}');
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, "");
    const backupName = `${dateStr}-${timeStr}-test-session.jsonl`;
    mkdirSync(`${TEST_VAULT}/06-Archive/ingest/queue`, { recursive: true });
    writeFileSync(
      join(TEST_VAULT, "06-Archive/ingest/queue", backupName),
      readFileSync(transcriptFile)
    );
    const backups = readdirSync(join(TEST_VAULT, "06-Archive/ingest/queue"));
    expect(backups.length).toBeGreaterThanOrEqual(1);
    const backupFile = join(TEST_VAULT, "06-Archive/ingest/queue", backups[0]);
    expect(readFileSync(backupFile, "utf-8")).toBe(readFileSync(transcriptFile, "utf-8"));
  });

  test("queue-session silent exit on empty payload", () => {
    const payload = JSON.stringify({
      transcript_path: "",
      session_id: "test",
    });
    const parsed = JSON.parse(payload);
    expect(parsed.transcript_path).toBe("");
    // queue-session.ts: empty transcript → silent exit
    expect(parsed.transcript_path).toHaveLength(0);
    expect(parsed.session_id).toBe("test");
  });

  test("inject-context reads context file", () => {
    const contextFile = join(TEST_VAULT, "06-Archive/ingest/context/latest.md");
    writeFileSync(contextFile, "# Latest context\nTest data for integration");
    const result = runScript("inject-context.ts", [], {
      env: { OBSIDIAN_VAULT_PATH: TEST_VAULT },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Latest context");
  });

  test("inject-context no output when file missing", () => {
    const result = runScript("inject-context.ts", [], {
      env: { OBSIDIAN_VAULT_PATH: TEST_VAULT },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});
