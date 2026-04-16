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
  let CONFIG_FILE: string;

  function checkInitialized(): string {
    if (!existsSync(CONFIG_FILE)) return "False";
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    return config.initialized ? "True" : "False";
  }

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
    TEST_VAULT = `${TEST_TMP}/vault`;
    HOME = `${TEST_TMP}/home`;
    CONFIG_FILE = join(TEST_TMP, ".vault-config.json");
    mkdirSync(join(HOME, ".claude"), { recursive: true });
    writeFileSync(join(HOME, ".claude/settings.json"), JSON.stringify({ hooks: {} }));
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  test("no config means not initialized", () => {
    expect(checkInitialized()).toBe("False");
  });

  test("initialized=false triggers initialization", () => {
    writeFileSync(CONFIG_FILE, JSON.stringify({ initialized: false }));
    expect(checkInitialized()).toBe("False");
  });

  test("initialized=true skips initialization", () => {
    writeFileSync(CONFIG_FILE, JSON.stringify({ initialized: true }));
    expect(checkInitialized()).toBe("True");
  });

  test("initialized key missing means not initialized", () => {
    writeFileSync(CONFIG_FILE, JSON.stringify({ vaultPath: "/some/path" }));
    expect(checkInitialized()).toBe("False");
  });

  test("complete install flow from scratch", () => {
    // Initial state: not initialized
    expect(checkInitialized()).toBe("False");

    // Run init
    const initResult = runScript("init-vault.ts", [TEST_VAULT, CONFIG_FILE]);
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
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    expect(config.vaultPath).toBe(TEST_VAULT);
  });

  test("re-run install does not overwrite existing config", () => {
    // First complete install
    runScript("init-vault.ts", [TEST_VAULT, CONFIG_FILE]);
    runScript("mount-hooks.ts", [], { env: { HOME } });

    const config1 = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    const vaultPathBefore = config1.vaultPath;

    // Re-run install
    runScript("init-vault.ts", [TEST_VAULT, CONFIG_FILE]);
    runScript("mount-hooks.ts", [], { env: { HOME } });

    const config2 = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    expect(config2.vaultPath).toBe(vaultPathBefore);
  });
});
