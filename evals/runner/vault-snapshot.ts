/**
 * Vault 快照管理
 *
 * 负责：
 * - 从模板初始化 vault
 * - 创建快照（运行前状态）
 * - 恢复快照（迭代重置）
 * - 比较快照（生成 vault diff）
 * - 复制目录（用于 skill 快照等场景）
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";

/**
 * 从模板目录初始化 vault
 */
export function initVaultFromTemplate(templateDir: string, vaultPath: string): void {
  if (existsSync(vaultPath)) {
    rmSync(vaultPath, { recursive: true });
  }
  copyDirRecursive(templateDir, vaultPath);
}

/**
 * 复制任意目录（用于 skill 快照等场景）
 */
export function copyDirectory(src: string, dest: string): void {
  if (!existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }
  copyDirRecursive(src, dest);
}

/**
 * 创建快照（保存运行前状态）
 */
export function createSnapshot(vaultPath: string, snapshotPath: string): void {
  if (existsSync(snapshotPath)) {
    rmSync(snapshotPath, { recursive: true });
  }
  copyDirRecursive(vaultPath, snapshotPath);
}

/**
 * 比较两个 vault 状态，返回 diff 信息
 */
export function diffVault(beforePath: string, afterPath: string): VaultDiff {
  const beforeFiles = collectFiles(beforePath);
  const afterFiles = collectFiles(afterPath);

  const diff: VaultDiff = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: [],
  };

  // Find added and modified files
  for (const [relPath, absPath] of Object.entries(afterFiles)) {
    if (!(relPath in beforeFiles)) {
      diff.added.push(relPath);
    } else {
      const beforeContent = readFileSync(beforeFiles[relPath], "utf-8");
      const afterContent = readFileSync(absPath, "utf-8");
      if (beforeContent !== afterContent) {
        diff.modified.push(relPath);
      } else {
        diff.unchanged.push(relPath);
      }
    }
  }

  // Find deleted files
  for (const relPath of Object.keys(beforeFiles)) {
    if (!(relPath in afterFiles)) {
      diff.deleted.push(relPath);
    }
  }

  return diff;
}

export interface VaultDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
}

/**
 * 格式化 diff 为可读文本
 */
export function formatVaultDiff(diff: VaultDiff): string {
  const lines: string[] = [];

  if (diff.added.length > 0) {
    lines.push("=== Added ===");
    for (const f of diff.added) lines.push(`  + ${f}`);
    lines.push("");
  }

  if (diff.modified.length > 0) {
    lines.push("=== Modified ===");
    for (const f of diff.modified) lines.push(`  ~ ${f}`);
    lines.push("");
  }

  if (diff.deleted.length > 0) {
    lines.push("=== Deleted ===");
    for (const f of diff.deleted) lines.push(`  - ${f}`);
    lines.push("");
  }

  lines.push(`Total: ${diff.added.length} added, ${diff.modified.length} modified, ${diff.deleted.length} deleted, ${diff.unchanged.length} unchanged`);

  return lines.join("\n");
}

// -- Private helpers --

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function collectFiles(dir: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!existsSync(dir)) return result;

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        result[relative(dir, fullPath)] = fullPath;
      }
    }
  }

  walk(dir);
  return result;
}

// -- CLI entry point --

function printUsage(): void {
  console.error("Usage:");
  console.error("  vault-snapshot init <templateDir> <targetDir>");
  console.error("  vault-snapshot snapshot <sourceDir> <targetDir>");
  console.error("  vault-snapshot diff <beforeDir> <afterDir> [--format=text|json]");
  console.error("  vault-snapshot copy <sourceDir> <targetDir>");
  process.exit(1);
}

function main(): void {
  try {
    const args = process.argv.slice(2);
    if (args.length < 1) printUsage();

    const command = args[0];

    switch (command) {
      case "init":
        if (args.length < 3) printUsage();
        if (!existsSync(args[1])) {
          console.error(`Error: template directory does not exist: ${args[1]}`);
          process.exit(1);
        }
        initVaultFromTemplate(args[1], args[2]);
        console.log(`Vault initialized from ${args[1]} to ${args[2]}`);
        break;

      case "snapshot":
        if (args.length < 3) printUsage();
        if (!existsSync(args[1])) {
          console.error(`Error: source directory does not exist: ${args[1]}`);
          process.exit(1);
        }
        createSnapshot(args[1], args[2]);
        console.log(`Snapshot created: ${args[2]}`);
        break;

      case "diff":
        if (args.length < 3) printUsage();
        const formatFlag = args.indexOf("--format");
        const format = formatFlag >= 0 && args[formatFlag + 1] === "json" ? "json" : "text";
        const diff = diffVault(args[1], args[2]);
        if (format === "json") {
          console.log(JSON.stringify(diff, null, 2));
        } else {
          console.log(formatVaultDiff(diff));
        }
        break;

      case "copy":
        if (args.length < 3) printUsage();
        copyDirectory(args[1], args[2]);
        console.log(`Directory copied: ${args[1]} -> ${args[2]}`);
        break;

      default:
        printUsage();
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
