import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync, statSync, readFileSync } from "fs";
import { join } from "path";
import {
  createTempDirSync,
  runScript,
  setupSkills,
  writeSettings,
  readSettings,
} from "../helpers/setup";

describe("mount-hooks", () => {
  let TEST_TMP: string;
  let TEST_SKILLS: string;
  let HOME: string;

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
    HOME = `${TEST_TMP}/home`;
    mkdirSync(join(HOME, ".claude"), { recursive: true });
    writeFileSync(join(HOME, ".claude/settings.json"), JSON.stringify({ hooks: {} }));
    TEST_SKILLS = setupSkills(TEST_TMP);
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  function _runMount() {
    return runScript("mount-hooks.sh", [TEST_SKILLS], { env: { HOME } });
  }

  test("exit 1 with no args", () => {
    const result = runScript("mount-hooks.sh");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("请提供");
  });

  test("copies scripts to hooks directory", () => {
    const result = _runMount();
    expect(result.status).toBe(0);
    expect(existsSync(join(HOME, ".claude/hooks/queue-session.sh"))).toBe(true);
    expect(existsSync(join(HOME, ".claude/hooks/inject-context.sh"))).toBe(true);
  });

  test("copied scripts are executable", () => {
    _runMount();
    expect(statSync(join(HOME, ".claude/hooks/queue-session.sh")).mode & 0o111).toBeTruthy();
    expect(statSync(join(HOME, ".claude/hooks/inject-context.sh")).mode & 0o111).toBeTruthy();
  });

  test("exit 2 when source scripts missing and does not modify settings", () => {
    rmSync(join(TEST_SKILLS, "refine-knowledge/scripts/queue-session.sh"));
    const mtimeBefore = statSync(join(HOME, ".claude/settings.json")).mtimeMs;
    const result = _runMount();
    const mtimeAfter = statSync(join(HOME, ".claude/settings.json")).mtimeMs;
    expect(result.status).toBe(2);
    expect(mtimeBefore).toBe(mtimeAfter);
  });

  test("settings.json registers hooks correctly", () => {
    _runMount();
    const settings = readSettings(HOME);
    const stopHooks = (settings.hooks as any)?.Stop || [];
    const startHooks = (settings.hooks as any)?.SessionStart || [];
    expect(stopHooks.length).toBeGreaterThanOrEqual(1);
    expect(startHooks.length).toBeGreaterThanOrEqual(1);
    const stopCmd = stopHooks[0].hooks[0].command;
    expect(stopCmd).toContain("queue-session.sh");
    const startCmd = startHooks[0].hooks[0].command;
    expect(startCmd).toContain("inject-context.sh");
  });

  test("multiple runs do not duplicate hooks (idempotent)", () => {
    _runMount();
    _runMount();
    _runMount();
    const settings = readSettings(HOME);
    const stopHooks = (settings.hooks as any)?.Stop || [];
    const startHooks = (settings.hooks as any)?.SessionStart || [];
    for (const h of stopHooks) {
      const cmds = h.hooks?.map((x: any) => x.command) || [];
      const count = cmds.filter((c: string) => c.includes("queue-session")).length;
      expect(count).toBeLessThanOrEqual(1);
    }
    for (const h of startHooks) {
      const cmds = h.hooks?.map((x: any) => x.command) || [];
      const count = cmds.filter((c: string) => c.includes("inject-context")).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  test("vault-config.json hooksMounted flag", () => {
    writeFileSync(join(TEST_SKILLS, ".vault-config.json"), "{}");
    _runMount();
    const config = JSON.parse(readFileSync(join(TEST_SKILLS, ".vault-config.json"), "utf-8"));
    expect(config.hooksMounted).toBe(true);
  });

  test("does not overwrite existing hooks", () => {
    writeSettings(HOME, {
      hooks: {
        Stop: [
          {
            matcher: ".*",
            hooks: [{ type: "command", command: "bash /some/other/hook.sh" }],
          },
        ],
      },
    });
    _runMount();
    const settings = readSettings(HOME);
    const stopHooks = (settings.hooks as any)?.Stop || [];
    const allCmds = stopHooks.flatMap((h: any) =>
      h.hooks?.map((x: any) => x.command) || []
    );
    expect(allCmds.some((c: string) => c.includes("other/hook"))).toBe(true);
    expect(allCmds.some((c: string) => c.includes("queue-session"))).toBe(true);
  });
});
