"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMigrationFiles = readMigrationFiles;
exports.hashContent = hashContent;
exports.createMigrationsTable = createMigrationsTable;
exports.isMigrationApplied = isMigrationApplied;
exports.recordMigration = recordMigration;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Read all SQL migration files from a directory and return them sorted lexicographically.
 * Each migration must be named with a numeric prefix (e.g., 001_*.sql, 002_*.sql, etc.)
 */
function readMigrationFiles(migrationsDir) {
    if (!fs_1.default.existsSync(migrationsDir)) {
        return [];
    }
    const files = fs_1.default
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort(); // Lexicographic order
    return files.map((filename) => {
        const filepath = path_1.default.join(migrationsDir, filename);
        const content = fs_1.default.readFileSync(filepath, 'utf-8');
        return { filename, content };
    });
}
/**
 * Compute SHA256 hash of migration content for idempotency checking.
 */
function hashContent(content) {
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Create the migrations tracking table if it doesn't exist.
 */
async function createMigrationsTable(pool) {
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
async function isMigrationApplied(pool, filename, hash) {
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
async function recordMigration(pool, filename, hash) {
    await pool.query('INSERT INTO _migrations (filename, hash) VALUES ($1, $2)', [filename, hash]);
}
