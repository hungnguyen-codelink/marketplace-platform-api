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
/**
 * Run all pending migrations.
 */
export declare function runMigrations(): Promise<void>;
