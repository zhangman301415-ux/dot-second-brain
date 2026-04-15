import { spawnSync } from "child_process";
import { cpSync, readFileSync, writeFileSync, mkdirSync, realpathSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";
import { join } from "path";

const SCRIPTS_DIR = join(__dirname, "../../skills/scripts");
const SKILLS_ROOT = join(__dirname, "../..");

/**
 * Create an isolated temp directory.
 * Returns the directory path.
 */
export async function createTempDir(): Promise<string> {
  return await mkdtemp(join(realpathSync(tmpdir()), "second-brain-test-"));
}

/**
 * Synchronous temp dir for BATS-style setup/teardown.
 */
export function createTempDirSync(): string {
  const prefix = join(realpathSync(tmpdir()), "second-brain-test-");
  return mkdtempSync(prefix);
}

/**
 * Run a shell script and return its result.
 */
export function runScript(
  scriptName: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string } = {}
): { status: number; stdout: string; stderr: string } {
  const scriptPath = join(SCRIPTS_DIR, scriptName);
  try {
    const result = spawnSync("bash", [scriptPath, ...args], {
      encoding: "utf-8",
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
    });
    return {
      status: result.status ?? 1,
      stdout: (result.stdout || "").trim(),
      stderr: (result.stderr || "").trim(),
    };
  } catch {
    return { status: 1, stdout: "", stderr: "Script execution failed" };
  }
}

/**
 * Run an arbitrary bash command.
 */
export function runBash(
  command: string,
  options: { env?: Record<string, string>; cwd?: string } = {}
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("bash", ["-c", command], {
    encoding: "utf-8",
    env: { ...process.env, ...options.env },
    cwd: options.cwd,
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

/**
 * Setup a vault directory structure under the given temp dir.
 * Returns the vault path.
 */
export function setupVault(tmpDir: string): string {
  const vault = join(tmpDir, "vault");
  mkdirSync(join(vault, "06-Archive/ingest/queue"), { recursive: true });
  mkdirSync(join(vault, "04-Working"), { recursive: true });
  mkdirSync(join(vault, "06-Archive/ingest/context"), { recursive: true });
  return vault;
}

/**
 * Setup a skills directory with real scripts copied in.
 * Returns the skills path.
 */
export function setupSkills(tmpDir: string): string {
  const skills = join(tmpDir, "skills");
  const refineScripts = join(skills, "refine-knowledge/scripts");
  const loaderScripts = join(skills, "context-loader/scripts");
  mkdirSync(refineScripts, { recursive: true });
  mkdirSync(loaderScripts, { recursive: true });

  cpSync(
    join(SKILLS_ROOT, "skills/refine-knowledge/scripts/queue-session.sh"),
    join(refineScripts, "queue-session.sh")
  );
  cpSync(
    join(SKILLS_ROOT, "skills/context-loader/scripts/inject-context.sh"),
    join(loaderScripts, "inject-context.sh")
  );
  return skills;
}

/**
 * Write settings.json to a fake home directory.
 */
export function writeSettings(homeDir: string, settings: object): void {
  const settingsPath = join(homeDir, ".claude/settings.json");
  mkdirSync(join(homeDir, ".claude"), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Read settings.json from a fake home directory.
 */
export function readSettings(homeDir: string): Record<string, unknown> {
  const settingsPath = join(homeDir, ".claude/settings.json");
  return JSON.parse(readFileSync(settingsPath, "utf-8"));
}
