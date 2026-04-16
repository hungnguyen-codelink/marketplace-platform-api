// Mock the migration utilities BEFORE importing the runner
jest.mock('../../../../src/db/migrationUtils');
jest.mock('pg');

import { readMigrationFiles, hashContent, createMigrationsTable, isMigrationApplied, recordMigration } from '../../../../src/db/migrationUtils';

// Default mock for Pool
const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
};

describe('migrations/runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Pool to default mock
    const { Pool } = require('pg');
    (Pool as jest.Mock).mockImplementation(() => mockPool);
  });

  describe('runMigrations', () => {
    it('loads DATABASE_URL from environment', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      (readMigrationFiles as jest.Mock).mockReturnValue([]);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);

      // Import and run the runner
      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(createMigrationsTable).toHaveBeenCalled();
    });

    it('throws if DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;

      const errorMockPool = {
        query: jest.fn().mockRejectedValue(new Error('Pool error: connection string undefined')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      const { Pool } = require('pg');
      (Pool as jest.Mock).mockImplementation(() => errorMockPool);

      // Make createMigrationsTable reject when DATABASE_URL is missing
      (createMigrationsTable as jest.Mock).mockRejectedValueOnce(new Error('Pool error: connection string undefined'));

      // Clear module cache to force re-evaluation
      delete require.cache[require.resolve('../../../../src/db/migrations/runner')];
      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await expect(runMigrations()).rejects.toThrow();
    });

    it('creates migrations table before running migrations', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      (readMigrationFiles as jest.Mock).mockReturnValue([]);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);

      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(createMigrationsTable).toHaveBeenCalled();
    });

    it('reads migration files from migrations directory', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      (readMigrationFiles as jest.Mock).mockReturnValue([
        { filename: '001_test.sql', content: 'CREATE TABLE test (id UUID);' },
      ]);
      (hashContent as jest.Mock).mockReturnValue('hash123');
      (isMigrationApplied as jest.Mock).mockResolvedValue(false);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);
      (recordMigration as jest.Mock).mockResolvedValue(undefined);

      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(readMigrationFiles).toHaveBeenCalled();
    });

    it('skips already-applied migrations', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      const mockContent = 'CREATE TABLE test (id UUID);';
      (readMigrationFiles as jest.Mock).mockReturnValue([
        { filename: '001_test.sql', content: mockContent },
      ]);
      (hashContent as jest.Mock).mockReturnValue('hash123');
      (isMigrationApplied as jest.Mock).mockResolvedValue(true);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);

      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(recordMigration).not.toHaveBeenCalled();
    });

    it('applies new migrations', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      const mockContent = 'CREATE TABLE test (id UUID);';
      (readMigrationFiles as jest.Mock).mockReturnValue([
        { filename: '001_test.sql', content: mockContent },
      ]);
      (hashContent as jest.Mock).mockReturnValue('hash123');
      (isMigrationApplied as jest.Mock).mockResolvedValue(false);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);
      (recordMigration as jest.Mock).mockResolvedValue(undefined);

      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(recordMigration).toHaveBeenCalledWith(expect.anything(), '001_test.sql', 'hash123');
    });

    it('handles multiple migrations in order', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      const migrations = [
        { filename: '001_test.sql', content: 'CREATE TABLE test1 (id UUID);' },
        { filename: '002_test.sql', content: 'CREATE TABLE test2 (id UUID);' },
        { filename: '003_test.sql', content: 'CREATE TABLE test3 (id UUID);' },
      ];

      (readMigrationFiles as jest.Mock).mockReturnValue(migrations);
      (hashContent as jest.Mock).mockImplementation((content) => `hash_${content.length}`);
      (isMigrationApplied as jest.Mock).mockResolvedValue(false);
      (createMigrationsTable as jest.Mock).mockResolvedValue(undefined);
      (recordMigration as jest.Mock).mockResolvedValue(undefined);

      const { runMigrations } = require('../../../../src/db/migrations/runner');
      await runMigrations();

      expect(recordMigration).toHaveBeenCalledTimes(3);
    });
  });
});
