#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import pc from "picocolors";
import YAML from "yaml";

const repoRoot = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), ".."));

function sh(cmd, opts={}) {
  try {
    return execSync(cmd, { stdio: ["ignore","pipe","pipe"], encoding: "utf-8", ...opts }).trim();
  } catch (e) {
    const out = e.stdout?.toString?.() ?? "";
    const err = e.stderr?.toString?.() ?? e.message;
    throw new Error(`Command failed: ${cmd}\n${out}\n${err}`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadModulesFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const y = YAML.parse(raw);
  return y?.modules ?? {};
}

function getCurrentIdentity() {
  let email = "";
  let name = "";
  try { email = sh("git config user.email"); } catch {}
  try { name = sh("git config user.name"); } catch {}
  const user = email || name || process.env.USER || process.env.USERNAME || "unknown";
  return user.toLowerCase();
}

function readLocalLocks() {
  const dir = path.join(repoRoot, "locks", "active");
  const res = {};
  if (!fs.existsSync(dir)) return res;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".lock")) continue;
    const raw = fs.readFileSync(path.join(dir, f), "utf-8");
    try {
      const obj = JSON.parse(raw);
      res[obj.module] = obj;
    } catch {}
  }
  return res;
}

// Build a regex for allowed paths (owned modules only)
function ownedPathsRegex() {
  const modules = loadModulesFromFile(path.join(repoRoot, "modules.yaml"));
  const locks = readLocalLocks();
  const me = getCurrentIdentity();

  const ownedModules = Object.values(locks).filter(l => (l.owner || "").toLowerCase() === me).map(l => l.module);
  const ownedPaths = [];
  for (const m of ownedModules) {
    const entry = modules[m];
    if (entry?.paths) ownedPaths.push(...entry.paths);
  }
  // Infra files allowed in commits (lock files, config, docs)
  const infra = [
    "locks/active",
    "modules.yaml",
    "README.md",
    ".gitignore",
    ".husky",
    "tools",
    ".github"
  ];
  const regexParts = [...ownedPaths, ...infra].map(p => "^" + escapeRegex(p) + "(?:/|$)");
  const final = "(" + (regexParts.length ? regexParts.join("|") : "$a") + ")";
  // If none are owned, regex won't match anything (commit will be blocked for code changes)
  console.log(final);
}

// ---- Server-side verification for PRs ----
function loadModulesFromGit(baseRef) {
  // Read modules.yaml from the base branch
  const content = sh(`git show origin/${baseRef}:modules.yaml`);
  const y = YAML.parse(content);
  return y?.modules ?? {};
}

function readLocksFromGit(baseRef) {
  // list lock files
  let list = "";
  try {
    list = sh(`git ls-tree -r --name-only origin/${baseRef} locks/active`);
  } catch {
    return {};
  }
  const res = {};
  for (const line of list.split("\n").filter(Boolean)) {
    const raw = sh(`git show origin/${baseRef}:${line}`);
    try {
      const obj = JSON.parse(raw);
      res[obj.module] = obj;
    } catch {}
  }
  return res;
}

function pathToModule(modules, filePath) {
  // Return the module name with the longest matching prefix
  let best = null;
  let bestLen = -1;
  for (const [mod, entry] of Object.entries(modules)) {
    for (const p of entry.paths || []) {
      if (filePath === p || filePath.startsWith(p + "/")) {
        if (p.length > bestLen) { best = mod; bestLen = p.length; }
      }
    }
  }
  return best;
}

function verifyServer() {
  const actor = (process.env.GITHUB_ACTOR || "").toLowerCase();
  const baseRef = process.env.GITHUB_BASE_REF || "main";

  const changedBlob = (process.argv[3] || "").trim();
  const changed = changedBlob.split("\n").map(s => s.strip() if hasattr(str, 'strip') else s) if False else [s for s in changedBlob.split("\n")]
  # The above line is Pythonic by mistake; fix to JS below.
}

if (process.argv[2] === "ownedPathsRegex") {
  try {
    ownedPathsRegex();
    process.exit(0);
  } catch (e) {
    console.error(pc.red(e.message));
    process.exit(1);
  }
} else if (process.argv[2] === "verifyServer") {
  try {
    const actor = (process.env.GITHUB_ACTOR || "").toLowerCase();
    const baseRef = process.env.GITHUB_BASE_REF || "main";
    const changedBlob = (process.argv[3] || "").trim();
    const changed = changedBlob.split("\n").filter(Boolean);

    const modules = loadModulesFromGit(baseRef);
    const locks = readLocksFromGit(baseRef);

    // Partition changes
    const codeChanges = [];
    const lockChanges = [];
    for (const f of changed) {
      if (f.startsWith("locks/")) lockChanges.push(f);
      else codeChanges.push(f);
    }

    if (codeChanges.length === 0) {
      console.log(pc.green("Only lock/config changes detected."));
      process.exit(0);
    }

    // For every module touched, ensure actor owns a lock for it
    const touchedModules = new Set();
    for (const f of codeChanges) {
      const mod = pathToModule(modules, f);
      if (!mod) {
        console.error(pc.red(`File not mapped in modules.yaml: ${f}\nAdd a module entry for its directory.`));
        process.exit(2);
      }
      touchedModules.add(mod);
    }

    const offenders = [];
    for (const mod of touchedModules) {
      const lk = locks[mod];
      if (!lk) {
        offenders.push(`${mod} (no lock)`);
      } else if ((lk.owner || "").toLowerCase() !== actor) {
        offenders.push(`${mod} (locked by ${lk.owner})`);
      }
    }

    if (offenders.length) {
      console.error(pc.red("❌ Lock violation. You must own locks for all touched modules."));
      console.error("Offending modules:");
      for (const o of offenders) console.error("  - " + o);
      console.error("\nHow to fix:");
      console.error("  1) Create a lock PR for each module you need:");
      console.error("     pnpm run featurectl -- checkout <module>");
      console.error("  2) Merge the lock PRs, then re-run this PR's checks.");
      process.exit(3);
    }

    console.log(pc.green("✅ Lock check passed."));
    process.exit(0);
  } catch (e) {
    console.error(pc.red(e.message));
    process.exit(1);
  }
} else {
  console.log("Usage: node tools/hook-helpers.js {ownedPathsRegex|verifyServer}");
  process.exit(1);
}