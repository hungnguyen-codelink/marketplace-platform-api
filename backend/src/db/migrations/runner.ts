/**
 * Standalone database migration runner.
 *
 * This script is designed to run independently of the Express app.
 * It loads dotenv directly and connects to the database using DATABASE_URL.
 * It DOES NOT import from ../config/env.ts to avoid requiring JWT_SECRET at migration time.
 *
 * Usage:
 *   npx ts-node src/db/migrations/runner.ts
 *   npm run db:migrate
 */

import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { readMigrationFiles, hashContent, createMigrationsTable, isMigrationApplied, recordMigration } from '../migrationUtils';

// Load .env directly
dotenv.config();

/**
 * Run all pending migrations.
 */
export async function runMigrations(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  try {
    console.log('Starting database migrations...');

    // Create the migrations tracking table
    await createMigrationsTable(pool);
    console.log('Migrations table ensured.');

    // Read all migration files
    const migrationsDir = path.join(__dirname);
    const migrations = readMigrationFiles(migrationsDir);

    if (migrations.length === 0) {
      console.log('No migrations found.');
      return;
    }

    console.log(`Found ${migrations.length} migration(s).`);

    let applied = 0;

    for (const { filename, content } of migrations) {
      const hash = hashContent(content);

      // Check if already applied
      const alreadyApplied = await isMigrationApplied(pool, filename, hash);

      if (alreadyApplied) {
        console.log(`✓ ${filename} (already applied)`);
        continue;
      }

      // Run the migration
      try {
        console.log(`→ ${filename}`);
        await pool.query(content);
        await recordMigration(pool, filename, hash);
        console.log(`✓ ${filename} (applied)`);
        applied++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`✗ ${filename} failed: ${errorMsg}`);
        throw err;
      }
    }

    console.log(`\nMigrations complete. ${applied} new migration(s) applied.`);
  } finally {
    await pool.end();
  }
}

// Run migrations if executed directly (as CLI script)
if (require.main === module) {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  runMigrations().catch((err) => {
    console.error('Migration runner failed:', err);
    process.exit(1);
  });
}
