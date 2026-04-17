#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_PATH = join(homedir(), ".claude", "second-brain", ".vault-config.json");
const DEFAULT_VAULT = `${homedir()}/Documents/SecondBrain`;

function resolveVault(): string {
  if (process.env.OBSIDIAN_VAULT_PATH) return process.env.OBSIDIAN_VAULT_PATH;
  try {
    if (existsSync(CONFIG_PATH)) {
      const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      if (config.vaultPath) return config.vaultPath;
    }
  } catch { /* ignore */ }
  return DEFAULT_VAULT;
}

const VAULT = resolveVault();
const CONTEXT = `${VAULT}/06-Archive/ingest/context/latest.md`;

if (existsSync(CONTEXT)) {
  process.stdout.write(readFileSync(CONTEXT, "utf-8"));
}
process.exit(0);
