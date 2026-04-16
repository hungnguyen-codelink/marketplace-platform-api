"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const migrationUtils_1 = require("../migrationUtils");
// Load .env directly
dotenv_1.default.config();
/**
 * Run all pending migrations.
 */
async function runMigrations() {
    const DATABASE_URL = process.env.DATABASE_URL;
    const pool = new pg_1.Pool({
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
    });
    try {
        console.log('Starting database migrations...');
        // Create the migrations tracking table
        await (0, migrationUtils_1.createMigrationsTable)(pool);
        console.log('Migrations table ensured.');
        // Read all migration files
        const migrationsDir = path_1.default.join(__dirname);
        const migrations = (0, migrationUtils_1.readMigrationFiles)(migrationsDir);
        if (migrations.length === 0) {
            console.log('No migrations found.');
            return;
        }
        console.log(`Found ${migrations.length} migration(s).`);
        let applied = 0;
        for (const { filename, content } of migrations) {
            const hash = (0, migrationUtils_1.hashContent)(content);
            // Check if already applied
            const alreadyApplied = await (0, migrationUtils_1.isMigrationApplied)(pool, filename, hash);
            if (alreadyApplied) {
                console.log(`✓ ${filename} (already applied)`);
                continue;
            }
            // Run the migration
            try {
                console.log(`→ ${filename}`);
                await pool.query(content);
                await (0, migrationUtils_1.recordMigration)(pool, filename, hash);
                console.log(`✓ ${filename} (applied)`);
                applied++;
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`✗ ${filename} failed: ${errorMsg}`);
                throw err;
            }
        }
        console.log(`\nMigrations complete. ${applied} new migration(s) applied.`);
    }
    finally {
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
