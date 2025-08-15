#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import YAML from "yaml";

const repoRoot = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), ".."));

function sh(cmd, opts={}) {
  try {
    return execSync(cmd, { stdio: ["ignore","pipe","pipe"], encoding: "utf-8", cwd: repoRoot, ...opts }).trim();
  } catch (e) {
    const out = e.stdout?.toString?.() ?? "";
    const err = e.stderr?.toString?.() ?? e.message;
    throw new Error(`Command failed: ${cmd}\n${out}\n${err}`);
  }
}

function info(msg) { console.log(msg); }
function warn(msg) { console.warn(msg); }
function die(msg) { console.error(msg); process.exit(1); }

function getDefaultBranch() {
  try {
    const ref = sh("git symbolic-ref refs/remotes/origin/HEAD");
    const m = ref.match(/refs\/remotes\/origin\/(.+)$/);
    return m ? m[1] : "main";
  } catch {
    return "main";
  }
}

function getMe() {
  let email="", name="";
  try { email = sh("git config user.email"); } catch {}
  try { name = sh("git config user.name"); } catch {}
  return (email || name || process.env.USER || process.env.USERNAME || "unknown").toLowerCase();
}

function readModules() {
  const raw = fs.readFileSync(path.join(repoRoot, "modules.yaml"), "utf-8");
  const y = YAML.parse(raw);
  return y?.modules ?? {};
}

function readLocksLocal() {
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

function requireClean() {
  const out = sh("git status --porcelain");
  if (out) die("Working tree not clean. Commit/stash first.");
}

function ensureHuskyInstalled() {
  // Make sure .husky exists. Users should run `pnpm i` & `pnpm prepare` once.
  if (!fs.existsSync(path.join(repoRoot, ".husky"))) {
    warn("Husky appears not initialized. Run: pnpm i && pnpm run prepare");
  }
}

function sparseInit() {
  try { sh("git sparse-checkout init --cone"); } catch {}
}

function sparseSet(paths) {
  const quoted = paths.map(p => `"${p}"`).join(" ");
  sh(`git sparse-checkout set ${quoted}`);
}

function chmodDir(dir, readOnly=true) {
  if (!fs.existsSync(dir)) return;
  const isWin = process.platform === "win32";
  if (isWin) {
    try { sh(`attrib ${readOnly?"+R":"-R"} "${dir}\\*" /S`); } catch {}
  } else {
    try { sh(`chmod -R ${readOnly?"a-w":"u+w"} "${dir}"`); } catch {}
  }
}

function computeAllowedPaths(modules, owned) {
  const paths = new Set();
  for (const m of owned) {
    for (const p of (modules[m]?.paths || [])) paths.add(p);
  }
  // infra always present
  ["locks/active", "modules.yaml", ".husky", "tools", ".github"].forEach(p => paths.add(p));
  return [...paths];
}

function listAllModulePaths(modules) {
  const s = new Set();
  for (const entry of Object.values(modules)) {
    for (const p of (entry.paths || [])) s.add(p);
  }
  return [...s];
}

function configureWorkspace(ownedModules) {
  const modules = readModules();
  const includeReadonly = process.env.FEATURECTL_INCLUDE_READONLY === "1";

  const ownedPaths = computeAllowedPaths(modules, ownedModules);
  const allModulePaths = listAllModulePaths(modules);

  sparseInit();
  if (includeReadonly) {
    const include = [...new Set([...allModulePaths, ...ownedPaths])];
    sparseSet(include);
    // Set RO for all module paths not owned
    const notOwned = allModulePaths.filter(p => !ownedPaths.includes(p));
    for (const p of notOwned) chmodDir(path.join(repoRoot, p), true);
    for (const p of ownedPaths) if (!p.endsWith(".yaml")) chmodDir(path.join(repoRoot, p), false);
  } else {
    // Minimal workspace (fast): only owned modules + infra
    sparseSet(ownedPaths);
  }

  info("✔ Workspace configured.");
}

function status() {
  const modules = readModules();
  const locks = readLocksLocal();
  const me = getMe();
  const mine = Object.values(locks).filter(l => (l.owner || "").toLowerCase() === me).map(l => l.module);

  console.log("Your identity:", me);
  console.log("Active locks:");
  for (const [m, l] of Object.entries(locks)) {
    const star = ((l.owner || "").toLowerCase() === me) ? "*" : " ";
    console.log(` ${star} ${m}  →  ${l.owner}  @ ${l.branch || "-"}  (${l.timestamp || "-"})`);
  }
  console.log("\nOwned modules:", mine.join(", ") || "(none)");
}

function createLockFile(moduleName, branchName) {
  const lockPath = path.join(repoRoot, "locks", "active", `${moduleName}.lock`);
  const payload = {
    module: moduleName,
    owner: getMe(),
    branch: branchName,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2));
  sh(`git add "${path.relative(repoRoot, lockPath)}"`);
}

function checkout(moduleName) {
  const modules = readModules();
  if (!modules[moduleName]) die(`Unknown module: ${moduleName}`);

  ensureHuskyInstalled();

  const base = getDefaultBranch();
  const me = getMe();
  // Pull latest to reduce lock collisions
  try { sh(`git fetch origin`); } catch {}
  try { sh(`git checkout ${base}`); } catch {}
  try { sh(`git pull --ff-only origin ${base}`); } catch {}

  // Create a small branch with just the lock file so you can PR it quickly
  const lockBranch = `lock/${moduleName}-${me.replace(/[^a-z0-9._-]/g,"_")}`;
  try { sh(`git checkout -B ${lockBranch} ${base}`); } catch {}
  createLockFile(moduleName, `feat/${moduleName}-${me.split("@")[0]}`);
  sh(`git commit -m "lock: acquire ${moduleName} by ${me}"`);
  console.log(`\n🔒 Created lock for '${moduleName}' on branch ${lockBranch}.`);
  console.log("Push & open a PR to activate server-side enforcement:");
  console.log(`  git push -u origin ${lockBranch}`);
  console.log(`  # then open a PR into ${base} (or use: gh pr create -B ${base} -t "lock: ${moduleName} by ${me}" -b "Lock ${moduleName} for ${me}")`);

  // Create your feature branch from latest base and switch
  const featBranch = `feat/${moduleName}-${me.split("@")[0]}`;
  try { sh(`git checkout -B ${featBranch} ${base}`); } catch {}

  // Configure workspace locally
  configureWorkspace([moduleName]);

  console.log(`\n✅ You're on ${featBranch}. Start coding in your module.`);
  console.log(`   (Server will enforce once the lock PR is merged.)`);
}

function release(moduleName) {
  const base = getDefaultBranch();
  // Ensure we base unlock on fresh base
  try { sh(`git fetch origin`); } catch {}
  try { sh(`git checkout -B unlock/${moduleName} ${base}`); } catch {}

  const lockFile = path.join(repoRoot, "locks", "active", `${moduleName}.lock`);
  if (fs.existsSync(lockFile)) {
    sh(`git rm --quiet "${path.relative(repoRoot, lockFile)}"`);
    sh(`git commit -m "lock: release ${moduleName}"`);
    console.log(`\n🔓 Removed lock for '${moduleName}'.`);
    console.log("Push & open a PR to release on server:");
    console.log(`  git push -u origin unlock/${moduleName}`);
    console.log(`  # then open a PR into ${base}`);
  } else {
    warn(`No local lock file found for ${moduleName}.`);
  }

  // Reconfigure workspace after release (you might own zero modules now)
  sync();
}

function sync() {
  const locks = readLocksLocal();
  const me = getMe();
  const owned = Object.values(locks).filter(l => (l.owner || "").toLowerCase() === me).map(l => l.module);
  configureWorkspace(owned);
}

const cmd = process.argv[2];
const arg = process.argv[3];

switch (cmd) {
  case "status":   status(); break;
  case "checkout": if (!arg) die("Usage: featurectl checkout <module>"); checkout(arg); break;
  case "release":  if (!arg) die("Usage: featurectl release <module>"); release(arg); break;
  case "sync":     sync(); break;
  default:
    console.log(`Usage:
  featurectl status
  featurectl checkout <module>
  featurectl release <module>
  featurectl sync

Env:
  FEATURECTL_INCLUDE_READONLY=1   # include other modules read-only in workspace
`);
}