import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { createTempDirSync, runScript } from "../helpers/setup";

describe("init-vault", () => {
  let TEST_TMP: string;
  let TEST_VAULT: string;
  let CONFIG_FILE: string;

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  function _runInit() {
    TEST_VAULT = `${TEST_TMP}/vault`;
    CONFIG_FILE = `${TEST_TMP}/config.json`;
    return runScript("init-vault.sh", [TEST_VAULT, CONFIG_FILE]);
  }

  test("exit 1 with no args", () => {
    const result = runScript("init-vault.sh");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("请提供 vault 路径");
  });

  test("exit 1 with relative path", () => {
    const result = runScript("init-vault.sh", ["relative/path"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("必须是绝对路径");
  });

  test("creates all directory structure", () => {
    const result = _runInit();
    expect(result.status).toBe(0);
    const dirs = [
      "00-Identity/capabilities",
      "00-Identity/narrative",
      "00-Identity/preferences",
      "00-Identity/relationships",
      "00-Identity/values",
      "01-Procedural",
      "02-Semantic/Areas",
      "02-Semantic/Resources",
      "03-Episodic",
      "04-Working",
      "05-Creation",
      "06-Archive/ingest/queue",
      "06-Archive/ingest/context",
    ];
    for (const dir of dirs) {
      expect(existsSync(`${TEST_VAULT}/${dir}`)).toBe(true);
    }
  });

  test("generates all template files on first run", () => {
    const result = _runInit();
    expect(result.status).toBe(0);
    const files = [
      "00-Identity/profile.md",
      "00-Identity/values/core-values.md",
      "00-Identity/capabilities/current-skills.md",
      "00-Identity/capabilities/growth-trajectory.md",
      "00-Identity/preferences/work-style.md",
      "00-Identity/relationships/communities.md",
      "00-Identity/narrative/turning-points.md",
    ];
    for (const file of files) {
      expect(existsSync(`${TEST_VAULT}/${file}`)).toBe(true);
    }
  });

  test("generates all index files", () => {
    const result = _runInit();
    expect(result.status).toBe(0);
    expect(existsSync(`${TEST_VAULT}/03-Episodic/index.md`)).toBe(true);
    expect(existsSync(`${TEST_VAULT}/01-Procedural/index.md`)).toBe(true);
    expect(existsSync(`${TEST_VAULT}/02-Semantic/index.md`)).toBe(true);
    expect(existsSync(`${TEST_VAULT}/04-Working/active.md`)).toBe(true);
  });

  test("template files contain correct frontmatter", () => {
    TEST_VAULT = `${TEST_TMP}/vault`;
    runScript("init-vault.sh", [TEST_VAULT]);
    const profile = readFileSync(`${TEST_VAULT}/00-Identity/profile.md`, "utf-8");
    expect(profile).toContain("---");
    expect(profile).toContain("type: profile");
    const episodic = readFileSync(`${TEST_VAULT}/03-Episodic/index.md`, "utf-8");
    expect(episodic).toContain("---");
    expect(episodic).toContain("type: episodic");
    const procedural = readFileSync(`${TEST_VAULT}/01-Procedural/index.md`, "utf-8");
    expect(procedural).toContain("---");
    expect(procedural).toContain("type: procedural");
    const working = readFileSync(`${TEST_VAULT}/04-Working/active.md`, "utf-8");
    expect(working).toContain("---");
    expect(working).toContain("type: working");
  });

  test("second run does not overwrite existing files (idempotent)", () => {
    TEST_VAULT = `${TEST_TMP}/vault`;
    CONFIG_FILE = `${TEST_TMP}/config.json`;
    runScript("init-vault.sh", [TEST_VAULT, CONFIG_FILE]);
    const contentBefore = readFileSync(`${TEST_VAULT}/00-Identity/profile.md`, "utf-8");
    runScript("init-vault.sh", [TEST_VAULT, CONFIG_FILE]);
    const contentAfter = readFileSync(`${TEST_VAULT}/00-Identity/profile.md`, "utf-8");
    expect(contentBefore).toBe(contentAfter);
  });

  test("config written to vault-config.json", () => {
    const result = _runInit();
    expect(result.status).toBe(0);
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    expect(config.vaultPath).toBe(TEST_VAULT);
    expect(config.initialized).toBe(true);
  });

  test("custom config path parameter", () => {
    TEST_VAULT = `${TEST_TMP}/vault`;
    const customConfig = `${TEST_TMP}/custom/path/config.json`;
    mkdirSync(`${TEST_TMP}/custom/path`, { recursive: true });
    const result = runScript("init-vault.sh", [TEST_VAULT, customConfig]);
    expect(result.status).toBe(0);
    expect(existsSync(customConfig)).toBe(true);
  });

  test("exit 2 when mkdir fails", () => {
    writeFileSync(`${TEST_TMP}/vault`, "blocking file");
    const result = runScript("init-vault.sh", [`${TEST_TMP}/vault`]);
    expect(result.status).toBe(2);
  });
});
