#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

function detectSsl(url) {
  if (!url) return false;
  if (/sslmode=require/i.test(url)) return true;
  const lower = url.toLowerCase();
  if (lower.includes('supabase.co') || lower.includes('neon.tech')) return true;
  return false;
}


(async () => {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/run-sql.js <path-to-sql-file>');
    process.exit(1);
  }
  const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(1);
  }

  const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error('Missing or invalid Postgres URL (DIRECT_URL or DATABASE_URL).');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, ssl: detectSsl(url) ? { rejectUnauthorized: false } : undefined });
  const client = await pool.connect();
  try {
    const sqlRaw = fs.readFileSync(sqlPath, 'utf8');
    const res = await client.query(sqlRaw);
    // If last statement was a SELECT, print rows
    if (/select[\s\S]*from/i.test(sqlRaw.trim())) {
      if (res?.rows) {
        console.log('--- Rows:', res.rowCount);
        console.table(res.rows);
      }
    }
    console.log('Executed SQL successfully:', path.basename(sqlPath));
  } catch (err) {
    console.error('SQL execution error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
