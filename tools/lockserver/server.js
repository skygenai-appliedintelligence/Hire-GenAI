#!/usr/bin/env node
/* eslint-disable */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const LOCKS_FILE = path.join(DATA_DIR, 'locks.json');
const FEATUREMAP_FILE = path.resolve(process.cwd(), '.featuremap.yml');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOCKS_FILE)) fs.writeFileSync(LOCKS_FILE, JSON.stringify({ locks: [] }, null, 2));

const app = express();
app.use(express.json({ limit: '1mb' }));

function now() { return Date.now(); }
function loadLocks() { return JSON.parse(fs.readFileSync(LOCKS_FILE, 'utf8')); }
function saveLocks(db) { fs.writeFileSync(LOCKS_FILE, JSON.stringify(db, null, 2)); }
function cleanup() {
  const db = loadLocks();
  db.locks = db.locks.filter(l => l.expiresAt > now());
  saveLocks(db);
}
setInterval(cleanup, 30_000).unref();

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/features', (_req, res) => {
  if (!fs.existsSync(FEATUREMAP_FILE)) return res.status(404).json({ error: '.featuremap.yml not found' });
  res.type('text/yaml').send(fs.readFileSync(FEATUREMAP_FILE, 'utf8'));
});

app.post('/features', (req, res) => {
  if (!req.body || !req.body.yaml) return res.status(400).json({ error: 'missing { yaml }' });
  fs.writeFileSync(FEATUREMAP_FILE, req.body.yaml, 'utf8');
  res.json({ ok: true });
});

app.get('/locks', (_req, res) => {
  cleanup();
  res.json(loadLocks());
});

app.post('/lock', (req, res) => {
  const { feature, user, leaseMinutes = 120 } = req.body || {};
  if (!feature || !user) return res.status(400).json({ error: 'feature and user required' });
  const db = loadLocks(); cleanup();
  const existing = db.locks.find(l => l.feature === feature && l.expiresAt > now());
  if (existing) return res.status(409).json({ error: 'locked', by: existing.user, until: existing.expiresAt });
  const id = crypto.randomUUID();
  const lock = { id, feature, user, createdAt: now(), expiresAt: now() + leaseMinutes * 60_000 };
  db.locks.push(lock); saveLocks(db);
  res.json(lock);
});

app.post('/unlock', (req, res) => {
  const { feature, user, id } = req.body || {};
  if (!feature || !user || !id) return res.status(400).json({ error: 'feature, user, id required' });
  const db = loadLocks();
  const before = db.locks.length;
  db.locks = db.locks.filter(l => !(l.feature === feature && l.user === user && l.id === id));
  saveLocks(db);
  res.json({ ok: true, removed: before - db.locks.length });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('Lock server on :' + (process.env.PORT || 8080));
});
