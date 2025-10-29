import { exec } from 'child_process';
import { join } from 'path';
import { log } from 'console';

const migrationFile = join(__dirname, '20251028_add_openai_project_id.sql');

// Database connection details from environment variables
const {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} = process.env;

const connectionString = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

// Run the migration
exec(`psql "${connectionString}" -f "${migrationFile}"`, (error, stdout, stderr) => {
  if (error) {
    log('❌ Error running migration:', error);
    process.exit(1);
  }
  
  if (stderr) {
    log('⚠️ Migration warnings:', stderr);
  }
  
  log('✅ Migration successful:', stdout);
  process.exit(0);
});
