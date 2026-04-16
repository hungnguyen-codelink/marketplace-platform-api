import { Pool } from 'pg';
/**
 * Read all SQL migration files from a directory and return them sorted lexicographically.
 * Each migration must be named with a numeric prefix (e.g., 001_*.sql, 002_*.sql, etc.)
 */
export declare function readMigrationFiles(migrationsDir: string): Array<{
    filename: string;
    content: string;
}>;
/**
 * Compute SHA256 hash of migration content for idempotency checking.
 */
export declare function hashContent(content: string): string;
/**
 * Create the migrations tracking table if it doesn't exist.
 */
export declare function createMigrationsTable(pool: Pool): Promise<void>;
/**
 * Check if a migration has already been applied by looking at the _migrations table.
 */
export declare function isMigrationApplied(pool: Pool, filename: string, hash: string): Promise<boolean>;
/**
 * Record a migration as applied in the _migrations table.
 */
export declare function recordMigration(pool: Pool, filename: string, hash: string): Promise<void>;
