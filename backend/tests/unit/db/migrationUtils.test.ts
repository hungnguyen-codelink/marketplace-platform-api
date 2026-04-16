import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  readMigrationFiles,
  hashContent,
  createMigrationsTable,
  isMigrationApplied,
  recordMigration,
} from '../../../src/db/migrationUtils';

jest.mock('fs');
jest.mock('crypto');

describe('migrationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readMigrationFiles', () => {
    it('returns empty array if directory does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = readMigrationFiles('/fake/dir');
      expect(result).toEqual([]);
    });

    it('reads and returns SQL files in lexicographic order', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['003.sql', '001.sql', '002.sql']);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce('-- SQL 1')
        .mockReturnValueOnce('-- SQL 2')
        .mockReturnValueOnce('-- SQL 3');

      const result = readMigrationFiles('/fake/dir');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ filename: '001.sql', content: '-- SQL 1' });
      expect(result[1]).toEqual({ filename: '002.sql', content: '-- SQL 2' });
      expect(result[2]).toEqual({ filename: '003.sql', content: '-- SQL 3' });
      expect(fs.readdirSync).toHaveBeenCalledWith('/fake/dir');
    });

    it('filters out non-SQL files', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001.sql', '002.txt', '003.sql', 'README.md']);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce('-- SQL 1')
        .mockReturnValueOnce('-- SQL 3');

      const result = readMigrationFiles('/fake/dir');

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('001.sql');
      expect(result[1].filename).toBe('003.sql');
    });
  });

  describe('hashContent', () => {
    it('computes SHA256 hash of content', () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123def456'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = hashContent('CREATE TABLE foo (id UUID)');

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith('CREATE TABLE foo (id UUID)');
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe('abc123def456');
    });

    it('returns different hashes for different content', () => {
      const mockHash1 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash1'),
      };
      const mockHash2 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash2'),
      };
      (crypto.createHash as jest.Mock).mockReturnValueOnce(mockHash1).mockReturnValueOnce(mockHash2);

      const hash1 = hashContent('content1');
      const hash2 = hashContent('content2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createMigrationsTable', () => {
    it('creates _migrations table if not exists', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      await createMigrationsTable(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS _migrations')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('filename TEXT NOT NULL')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('hash TEXT NOT NULL')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('applied_at TIMESTAMPTZ')
      );
    });
  });

  describe('isMigrationApplied', () => {
    it('returns false if migration not in table', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      const result = await isMigrationApplied(mockPool, 'test.sql', 'hash123');

      expect(result).toBe(false);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT hash FROM _migrations WHERE filename = $1',
        ['test.sql']
      );
    });

    it('returns true if migration exists with matching hash', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [{ hash: 'hash123' }] }),
      };

      const result = await isMigrationApplied(mockPool, 'test.sql', 'hash123');

      expect(result).toBe(true);
    });

    it('returns false if migration exists but hash does not match', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [{ hash: 'oldhash' }] }),
      };

      const result = await isMigrationApplied(mockPool, 'test.sql', 'hash123');

      expect(result).toBe(false);
    });
  });

  describe('recordMigration', () => {
    it('inserts migration record into _migrations table', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      await recordMigration(mockPool, 'test.sql', 'hash123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO _migrations (filename, hash) VALUES ($1, $2)',
        ['test.sql', 'hash123']
      );
    });
  });
});
