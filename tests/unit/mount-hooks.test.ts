import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  createTempDirSync,
  runScript,
  writeSettings,
  readSettings,
} from "../helpers/setup";

describe("mount-hooks", () => {
  let TEST_TMP: string;
  let HOME: string;

  beforeEach(() => {
    TEST_TMP = createTempDirSync();
    HOME = `${TEST_TMP}/home`;
    mkdirSync(join(HOME, ".claude"), { recursive: true });
    writeFileSync(join(HOME, ".claude/settings.json"), JSON.stringify({ hooks: {} }));
  });

  afterEach(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  function _runMount() {
    return runScript("mount-hooks.ts", [], { env: { HOME } });
  }

  test("exit 0 with no args (npm mode doesn't require args)", () => {
    const result = _runMount();
    expect(result.status).toBe(0);
  });

  test("settings.json registers npx commands", () => {
    _runMount();
    const settings = readSettings(HOME);
    const stopHooks = (settings.hooks as any)?.Stop || [];
    const startHooks = (settings.hooks as any)?.SessionStart || [];
    expect(stopHooks.length).toBeGreaterThanOrEqual(1);
    expect(startHooks.length).toBeGreaterThanOrEqual(1);
    const stopCmd = stopHooks[0].hooks[0].command;
    expect(stopCmd).toContain("second-brain-stop-hook");
    const startCmd = startHooks[0].hooks[0].command;
    expect(startCmd).toContain("second-brain-session-start-hook");
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
      const count = cmds.filter((c: string) => c.includes("second-brain-stop-hook")).length;
      expect(count).toBeLessThanOrEqual(1);
    }
    for (const h of startHooks) {
      const cmds = h.hooks?.map((x: any) => x.command) || [];
      const count = cmds.filter((c: string) => c.includes("second-brain-session-start-hook")).length;
      expect(count).toBeLessThanOrEqual(1);
    }
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
    expect(allCmds.some((c: string) => c.includes("second-brain"))).toBe(true);
  });
});
