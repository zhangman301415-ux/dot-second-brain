#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";

const VAULT = process.argv[2] ?? "";
if (!VAULT) {
  process.stderr.write("错误: 请提供 vault 路径\n");
  process.stderr.write("用法: node init-vault.js <vault-path>\n");
  process.exit(1);
}

if (!VAULT.startsWith("/")) {
  process.stderr.write(`错误: vault 路径必须是绝对路径: ${VAULT}\n`);
  process.exit(1);
}

const COMMANDS_DIR = dirname(new URL(import.meta.url).pathname);
const TEMPLATES_DIR = join(COMMANDS_DIR, "..", "templates", "vault-templates");
const CONFIG = process.argv[3] ?? resolve(VAULT, ".vault-config.json");
const TODAY = new Date().toISOString().slice(0, 10);

// 1. Create directory structure
try {
  mkdirSync(join(VAULT, "00-Identity/capabilities"), { recursive: true });
  mkdirSync(join(VAULT, "00-Identity/narrative"), { recursive: true });
  mkdirSync(join(VAULT, "00-Identity/preferences"), { recursive: true });
  mkdirSync(join(VAULT, "00-Identity/relationships"), { recursive: true });
  mkdirSync(join(VAULT, "00-Identity/values"), { recursive: true });
  mkdirSync(join(VAULT, "01-Procedural"), { recursive: true });
  mkdirSync(join(VAULT, "02-Semantic/Areas"), { recursive: true });
  mkdirSync(join(VAULT, "02-Semantic/Resources"), { recursive: true });
  mkdirSync(join(VAULT, "03-Episodic"), { recursive: true });
  mkdirSync(join(VAULT, "04-Working"), { recursive: true });
  mkdirSync(join(VAULT, "05-Creation"), { recursive: true });
  mkdirSync(join(VAULT, "06-Archive/ingest/queue"), { recursive: true });
  mkdirSync(join(VAULT, "06-Archive/ingest/context"), { recursive: true });
} catch {
  process.exit(2);
}

/**
 * Read a template file, replace {{TODAY}} placeholders, write to vault.
 * Skips if target file already exists.
 */
function writeFromTemplate(vaultPath: string, templateFile: string): void {
  const fullPath = join(VAULT, vaultPath);
  if (existsSync(fullPath)) return;
  const templatePath = join(TEMPLATES_DIR, templateFile);
  if (!existsSync(templatePath)) return;
  const content = readFileSync(templatePath, "utf-8").replace(/\{\{TODAY\}\}/g, TODAY);
  writeFileSync(fullPath, content);
}

// 2. Generate index files
writeFromTemplate("03-Episodic/index.md", "episodic-index-template.md");
writeFromTemplate("01-Procedural/index.md", "procedural-index-template.md");
writeFromTemplate("02-Semantic/index.md", "semantic-index-template.md");
writeFromTemplate("04-Working/active.md", "active-template.md");

// 3. Generate Identity templates
const identityMappings: [string, string][] = [
  ["00-Identity/profile.md", "profile-template.md"],
  ["00-Identity/values/core-values.md", "core-values-template.md"],
  ["00-Identity/capabilities/current-skills.md", "current-skills-template.md"],
  ["00-Identity/capabilities/growth-trajectory.md", "growth-trajectory-template.md"],
  ["00-Identity/preferences/work-style.md", "work-style-template.md"],
  ["00-Identity/narrative/turning-points.md", "turning-points-template.md"],
  ["00-Identity/relationships/communities.md", "communities-template.md"],
  ["00-Identity/pending-updates.md", "pending-updates-template.md"],
];

for (const [vaultPath, templateFile] of identityMappings) {
  const fullPath = join(VAULT, vaultPath);
  if (!existsSync(fullPath)) {
    const templatePath = join(TEMPLATES_DIR, templateFile);
    if (existsSync(templatePath)) {
      const content = readFileSync(templatePath, "utf-8").replace(/\{\{TODAY\}\}/g, TODAY);
      writeFileSync(fullPath, content);
    }
  }
}

// 4. Update .vault-config.json
let config: Record<string, unknown> = {};
if (existsSync(CONFIG)) {
  try {
    config = JSON.parse(readFileSync(CONFIG, "utf-8"));
  } catch {
    config = {};
  }
}
config["vaultPath"] = VAULT;
config["initialized"] = true;
writeFileSync(CONFIG, JSON.stringify(config, null, 2));

process.exit(0);
