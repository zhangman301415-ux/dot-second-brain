import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  createTempDirSync,
  runScript,
  readSettings,
} from "../helpers/setup";

describe("installation", () => {
  let TEST_TMP: string;
  let TEST_VAULT: string;
  let HOME: string;
  let CONFIG_DIR: string;

  function checkInitialized(): string {
    const configPath = join(CONFIG_DIR, ".vault-config.json");
    if (!existsSync(configPath)) return "False";
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    return config.initialized ? "True" : "False";
  }

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

  test("no config means not initialized", () => {
    expect(checkInitialized()).toBe("False");
  });

  test("initialized=false triggers initialization", () => {
    writeFileSync(join(CONFIG_DIR, ".vault-config.json"), JSON.stringify({ initialized: false }));
    expect(checkInitialized()).toBe("False");
  });

  test("initialized=true skips initialization", () => {
    writeFileSync(join(CONFIG_DIR, ".vault-config.json"), JSON.stringify({ initialized: true }));
    expect(checkInitialized()).toBe("True");
  });

  test("initialized key missing means not initialized", () => {
    writeFileSync(join(CONFIG_DIR, ".vault-config.json"), JSON.stringify({ vaultPath: "/some/path" }));
    expect(checkInitialized()).toBe("False");
  });

  test("complete install flow from scratch", () => {
    // Initial state: not initialized
    expect(checkInitialized()).toBe("False");

    // Run init
    const initResult = runScript("init-vault.ts", [TEST_VAULT], { env: { SECOND_BRAIN_CONFIG_DIR: CONFIG_DIR } });
    expect(initResult.status).toBe(0);
    expect(checkInitialized()).toBe("True");

    // Run mount
    const mountResult = runScript("mount-hooks.ts", [], { env: { HOME } });
    expect(mountResult.status).toBe(0);

    // Verify vault structure
    expect(existsSync(join(TEST_VAULT, "00-Identity/capabilities"))).toBe(true);
    expect(existsSync(join(TEST_VAULT, "06-Archive/ingest/queue"))).toBe(true);
    expect(existsSync(join(TEST_VAULT, "00-Identity/profile.md"))).toBe(true);

    // Verify settings.json hooks registered
    const settings = readSettings(HOME);
    expect(settings.hooks).toHaveProperty("Stop");
    expect(settings.hooks).toHaveProperty("SessionStart");

    // Verify vault-config state
    const config = JSON.parse(readFileSync(join(CONFIG_DIR, ".vault-config.json"), "utf-8"));
    expect(config.vaultPath).toBe(TEST_VAULT);
  });

  test("re-run install does not overwrite existing config", () => {
    // First complete install
    runScript("init-vault.ts", [TEST_VAULT], { env: { SECOND_BRAIN_CONFIG_DIR: CONFIG_DIR } });
    runScript("mount-hooks.ts", [], { env: { HOME } });

    const config1 = JSON.parse(readFileSync(join(CONFIG_DIR, ".vault-config.json"), "utf-8"));
    const vaultPathBefore = config1.vaultPath;

    // Re-run install
    runScript("init-vault.ts", [TEST_VAULT], { env: { SECOND_BRAIN_CONFIG_DIR: CONFIG_DIR } });
    runScript("mount-hooks.ts", [], { env: { HOME } });

    const config2 = JSON.parse(readFileSync(join(CONFIG_DIR, ".vault-config.json"), "utf-8"));
    expect(config2.vaultPath).toBe(vaultPathBefore);
  });
});
