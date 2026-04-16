import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, realpathSync, mkdtempSync, existsSync } from "fs";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";
import { join, resolve } from "path";

const DIST_DIR = resolve(join(__dirname, "../../dist"));
const SKILLS_ROOT = resolve(join(__dirname, "../.."));

// Ensure dist exists before running tests
if (!existsSync(join(DIST_DIR, "commands"))) {
  const buildResult = spawnSync("npm", ["run", "build"], {
    encoding: "utf-8",
    stdio: "inherit",
    cwd: SKILLS_ROOT,
  });
  if (buildResult.status !== 0) {
    throw new Error("Build failed before tests");
  }
}

export async function createTempDir(): Promise<string> {
  return await mkdtemp(join(realpathSync(tmpdir()), "second-brain-test-"));
}

export function createTempDirSync(): string {
  const prefix = join(realpathSync(tmpdir()), "second-brain-test-");
  return mkdtempSync(prefix);
}

export function runScript(
  scriptName: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string } = {}
): { status: number; stdout: string; stderr: string } {
  const baseName = scriptName.replace(/\.(sh|ts)$/, "");
  const scriptPath = join(DIST_DIR, "commands", `${baseName}.js`);
  try {
    const result = spawnSync("node", [scriptPath, ...args], {
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

export function setupVault(tmpDir: string): string {
  const vault = join(tmpDir, "vault");
  mkdirSync(join(vault, "06-Archive/ingest/queue"), { recursive: true });
  mkdirSync(join(vault, "04-Working"), { recursive: true });
  mkdirSync(join(vault, "06-Archive/ingest/context"), { recursive: true });
  return vault;
}

export function writeSettings(homeDir: string, settings: object): void {
  const settingsPath = join(homeDir, ".claude", "settings.json");
  mkdirSync(join(homeDir, ".claude"), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

export function readSettings(homeDir: string): Record<string, unknown> {
  const settingsPath = join(homeDir, ".claude", "settings.json");
  return JSON.parse(readFileSync(settingsPath, "utf-8"));
}
