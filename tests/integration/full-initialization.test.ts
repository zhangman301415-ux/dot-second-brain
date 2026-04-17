import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import {
  createTempDirSync,
  runScript,
  readSettings,
} from "../helpers/setup";

describe("full-initialization", () => {
  let TEST_TMP: string;
  let TEST_VAULT: string;
  let HOME: string;
  let CONFIG_DIR: string;

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
    TEST_VAULT = `${TEST_TMP}/vault`;
    HOME = `${TEST_TMP}/home`;
    CONFIG_DIR = `${TEST_TMP}/second-brain-config`;
    mkdirSync(join(HOME, ".claude"), { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(join(HOME, ".claude/settings.json"), JSON.stringify({ hooks: {} }));
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  test("full initialization end-to-end", () => {
    const initResult = runScript("init-vault.ts", [TEST_VAULT], { env: { SECOND_BRAIN_CONFIG_DIR: CONFIG_DIR } });
    expect(initResult.status).toBe(0);
    expect(existsSync(join(TEST_VAULT, "00-Identity/capabilities"))).toBe(true);
    expect(existsSync(join(TEST_VAULT, "06-Archive/ingest/queue"))).toBe(true);
    expect(existsSync(join(TEST_VAULT, "00-Identity/profile.md"))).toBe(true);
    expect(existsSync(join(TEST_VAULT, "03-Episodic/index.md"))).toBe(true);
    const configPath = join(CONFIG_DIR, ".vault-config.json");
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.initialized).toBe(true);
  });

  test("init then mount hooks", () => {
    const initResult = runScript("init-vault.ts", [TEST_VAULT], { env: { SECOND_BRAIN_CONFIG_DIR: CONFIG_DIR } });
    expect(initResult.status).toBe(0);
    const mountResult = runScript("mount-hooks.ts", [], { env: { HOME } });
    expect(mountResult.status).toBe(0);
    const settings = readSettings(HOME);
    expect(settings.hooks).toHaveProperty("Stop");
    expect(settings.hooks).toHaveProperty("SessionStart");
  });
});
