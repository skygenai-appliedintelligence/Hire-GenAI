#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const CONFIG = path.join(os.homedir(), '.featurectl.json');

function readConfig() {
  if (!fs.existsSync(CONFIG)) return {};
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
}
function writeConfig(c) { fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2)); }

async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}` + ' ' + await res.text());
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

function run(cmd, opts = {}) {
  console.log('> ' + cmd);
  cp.execSync(cmd, { stdio: 'inherit', ...opts });
}

// simple glob → RegExp (supports *, **)
function globToRe(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const re = esc.replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*');
  return new RegExp('^' + re + '$');
}

function matchAny(globs, file) {
  return globs.some(g => globToRe(g).test(file.replace(/\\/g, '/')));
}

async function getFeaturemap(server) {
  const yaml = await http('GET', server + '/features');
  // tiny YAML parse (assumes valid map) — or require('yaml') if you prefer
  const lines = String(yaml).split(/\r?\n/);
  const features = [];
  let current = null;
  let inPaths = false;
  for (const line of lines) {
    if (/^\s*-\s+name:/.test(line)) {
      const name = line.split(':')[1].trim();
      current = { name, paths: [], build: null, test: null };
      features.push(current); inPaths = false; continue;
    }
    if (!current) continue;
    if (/paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /-\s+/.test(line)) current.paths.push(line.replace(/.*-\s+/, '').trim());
    if (/build:\s+/.test(line)) current.build = line.split(':').slice(1).join(':').trim().replace(/^"|"$/g, '');
    if (/test:\s+/.test(line)) current.test  = line.split(':').slice(1).join(':').trim().replace(/^"|"$/g, '');
  }
  return features;
}

async function cmdInit(argv){
  const [server, user, repo] = [argv[0], argv[1], argv[2]];
  if (!server || !user) {
    console.log('usage: featurectl init <server_url> <user_email> [repo_slug]');
    process.exit(1);
  }
  const cfg = readConfig();
  cfg.server = server.replace(/\/$/, '');
  cfg.user = user; cfg.repo = repo || path.basename(process.cwd());
  writeConfig(cfg); console.log('saved', CONFIG, cfg);
}

async function cmdLock(argv){
  const [feature, lease] = [argv[0], Number(argv[1]||120)];
  const { server, user } = readConfig();
  const res = await http('POST', server + '/lock', { feature, user, leaseMinutes: lease });
  fs.writeFileSync('.feature.lock.json', JSON.stringify(res, null, 2));
  console.log('LOCKED', res);
}

async function cmdUnlock(){
  const { server, user } = readConfig();
  if (!fs.existsSync('.feature.lock.json')) throw new Error('no local lock');
  const lock = JSON.parse(fs.readFileSync('.feature.lock.json', 'utf8'));
  await http('POST', server + '/unlock', { feature: lock.feature, user, id: lock.id });
  fs.rmSync('.feature.lock.json', { force: true });
  console.log('UNLOCKED');
}

async function cmdCheckout(argv){
  const feature = argv[0];
  const { server } = readConfig();
  const map = await getFeaturemap(server);
  const f = map.find(x => x.name === feature);
  if (!f) throw new Error('unknown feature: ' + feature);

  // Branch + sparse checkout
  const branch = `feat/${feature}`;
  try { run(`git checkout -b ${branch}`); } catch { run(`git checkout ${branch}`); }
  try { run(`git sparse-checkout init --cone`); } catch {}
  run(`git sparse-checkout set ${f.paths.join(' ')}`);

  // Make non‑feature files read‑only (best‑effort)
  const all = cp.execSync('git ls-files', { encoding: 'utf8' }).trim().split(/\r?\n/);
  const allowed = all.filter(p => matchAny(f.paths, p));
  const disallowed = all.filter(p => !matchAny(f.paths, p));
  for (const p of disallowed) {
    try { fs.chmodSync(p, 0o444); } catch {}
  }
  for (const p of allowed) {
    try { fs.chmodSync(p, 0o644); } catch {}
  }
  console.log('Checked out feature', feature, '\nAllowed paths:', f.paths);
}

async function cmdBuild(argv){
  const feature = argv[0];
  const { server } = readConfig();
  const map = await getFeaturemap(server);
  const f = map.find(x => x.name === feature);
  if (!f) throw new Error('unknown feature');
  if (f.build) run(f.build);
  else run('npm run build || true');
}

async function cmdTest(argv){
  const feature = argv[0];
  const { server } = readConfig();
  const map = await getFeaturemap(server);
  const f = map.find(x => x.name === feature);
  if (!f) throw new Error('unknown feature');
  if (f.test) run(f.test);
  else run('npm test || true');
}

async function cmdCheckin(argv){
  const feature = argv[0];
  await cmdTest([feature]);
  await cmdBuild([feature]);
  run('git add -A');
  run(`git commit -m "${feature}: work"`);
  run('git push -u origin HEAD');
  await cmdUnlock();
}

async function cmdVerifyStaged(){
  const { server, user } = readConfig();
  const map = await getFeaturemap(server);
  const lock = fs.existsSync('.feature.lock.json') ? JSON.parse(fs.readFileSync('.feature.lock.json','utf8')) : null;
  if (!lock || lock.user !== user) {
    console.error('No valid lock in this repo. Run: featurectl lock <feature>');
    process.exit(2);
  }
  const f = map.find(x => x.name === lock.feature);
  if (!f) { console.error('Locked feature no longer exists'); process.exit(2); }
  const staged = cp.execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  const bad = staged.filter(p => !matchAny(f.paths, p));
  if (bad.length) {
    console.error('\n❌ You staged files outside feature', f.name, ':\n' + bad.join('\n'));
    console.error('\nAllowed globs:\n - ' + f.paths.join('\n - '));
    process.exit(3);
  }
  console.log('✓ staged files are within feature', f.name);
}

async function main(){
  const [cmd, ...argv] = process.argv.slice(2);
  const map = {
    init: cmdInit,
    lock: cmdLock,
    unlock: cmdUnlock,
    checkout: cmdCheckout,
    build: cmdBuild,
    test: cmdTest,
    checkin: cmdCheckin,
    'verify-staged': cmdVerifyStaged,
  };
  if (!map[cmd]) {
    console.log(`usage:\n  featurectl init <server_url> <user_email> [repo]\n  featurectl lock <feature> [leaseMinutes]\n  featurectl unlock\n  featurectl checkout <feature>\n  featurectl test <feature>\n  featurectl build <feature>\n  featurectl checkin <feature>\n  featurectl verify-staged`);
    process.exit(1);
  }
  try { await map[cmd](argv); } catch (e) { console.error(e.message||e); process.exit(1); }
}

main();
