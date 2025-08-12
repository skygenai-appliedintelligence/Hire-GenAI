#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

function getArgValue(flag) {
  const i = process.argv.findIndex(a => a === flag || a.startsWith(flag + '='));
  if (i === -1) return undefined;
  const val = process.argv[i].includes('=') ? process.argv[i].split('=').slice(1).join('=') : process.argv[i + 1];
  return val;
}

function resolveDatabaseUrl() {
  const cliUrl = getArgValue('--url');
  // Prefer DIRECT_URL for schema ops (unpooled, e.g., Neon without pgbouncer)
  const envUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  const url = (cliUrl || envUrl || '').trim();
  if (!url) return null;
  // basic sanity check
  if (!/^postgres(ql)?:\/\//i.test(url)) return null;
  const placeholderTokens = [
    '<PROJECT-REF>', '<SUPABASE_DB_PASSWORD>',
    'YOUR_PROJECT_REF', 'YOUR_SUPABASE_DB_PASSWORD', 'YOUR_REAL_DB_PASSWORD'
  ];
  if (/[<>]/.test(url) || placeholderTokens.some(t => url.includes(t))) {
    console.error('Invalid placeholder values detected in connection URL. Replace angle-bracket placeholders with real values.');
    return null;
  }
  return url;
}

function detectSsl(url) {
  if (!url) return false;
  if (/sslmode=require/i.test(url)) return true;
  const lower = url.toLowerCase();
  if (lower.includes('supabase.co') || lower.includes('neon.tech')) return true;
  return false;
}

async function run() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error('No valid Postgres URL provided. Use one of:\n' +
      '  - Set DATABASE_URL in .env.local\n' +
      '  - Or pass --url "postgres://user:pass@host:5432/db?sslmode=require"');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    ssl: detectSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();
  try {
    const schemaPath = path.join(process.cwd(), 'scripts', '002-prisma-postgres-schema.sql');
    const seedPath = path.join(process.cwd(), 'scripts', '003-insert-dummy-data.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf8') : '';

    console.log('Applying schema...');
    await client.query('begin');
    await client.query(schemaSql);
    await client.query('commit');
    console.log('Schema applied.');

    const schemaOnly = process.argv.includes('--schema-only') || process.env.DB_APPLY_SCHEMA_ONLY === 'true';
    if (!schemaOnly && seedSql.trim().length > 0) {
      console.log('Inserting dummy data...');
      await client.query('begin');
      await client.query(seedSql);
      await client.query('commit');
      console.log('Dummy data inserted.');
    } else {
      console.log('Seed step skipped.');
    }
  } catch (err) {
    try { await client.query('rollback'); } catch (_) {}
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();


