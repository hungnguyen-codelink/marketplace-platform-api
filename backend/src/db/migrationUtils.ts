import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Read all SQL migration files from a directory and return them sorted lexicographically.
 * Each migration must be named with a numeric prefix (e.g., 001_*.sql, 002_*.sql, etc.)
 */
export function readMigrationFiles(migrationsDir: string): Array<{ filename: string; content: string }> {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Lexicographic order

  return files.map((filename) => {
    const filepath = path.join(migrationsDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    return { filename, content };
  });
}

/**
 * Compute SHA256 hash of migration content for idempotency checking.
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Create the migrations tracking table if it doesn't exist.
 */
export async function createMigrationsTable(pool: any): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT NOT NULL,
      hash TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (filename)
    );
  `);
}

/**
 * Check if a migration has already been applied by looking at the _migrations table.
 */
export async function isMigrationApplied(pool: any, filename: string, hash: string): Promise<boolean> {
  const result = await pool.query('SELECT hash FROM _migrations WHERE filename = $1', [filename]);

  if (result.rows.length === 0) {
    return false;
  }

  // Check if hash matches (to detect if migration file changed after being applied)
  return result.rows[0].hash === hash;
}

/**
 * Record a migration as applied in the _migrations table.
 */
export async function recordMigration(pool: any, filename: string, hash: string): Promise<void> {
  await pool.query('INSERT INTO _migrations (filename, hash) VALUES ($1, $2)', [filename, hash]);
}
