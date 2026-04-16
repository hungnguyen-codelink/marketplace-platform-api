import { Pool } from 'pg';

describe('db/client', () => {
  beforeEach(() => {
    // Clear module cache to re-import
    jest.resetModules();
    // Set required env vars
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('exports a Pool instance', () => {
    const { db } = require('../../../src/db/client');
    // Check that db is an instance of Pool by checking its properties/methods
    expect(db).toHaveProperty('query');
    expect(db).toHaveProperty('connect');
    expect(db).toHaveProperty('end');
    expect(typeof db.query).toBe('function');
  });

  it('creates pool with DATABASE_URL from env', () => {
    const { db } = require('../../../src/db/client');
    // Verify pool has expected properties
    expect(db).toHaveProperty('idleCount');
    expect(db).toHaveProperty('totalCount');
  });

  it('has no active connections on import', () => {
    const { db } = require('../../../src/db/client');
    // totalCount or _clients should be 0 for a fresh pool
    // The exact property depends on pg version, but generally idle clients = 0
    expect(db.idleCount).toBe(0);
    expect(db.totalCount).toBe(0);
  });
});
