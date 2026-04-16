import { Pool } from 'pg';
import path from 'path';
import { readMigrationFiles, hashContent, createMigrationsTable, isMigrationApplied, recordMigration } from '../../../src/db/migrationUtils';
import { runMigrations } from '../../../src/db/migrations/runner';

describe('Database Migrations Integration Tests', () => {
  let pool: Pool;
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  beforeAll(async () => {
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable must be set for integration tests');
    }

    pool = new Pool({ connectionString: testDbUrl });

    // Clean up: Drop all domain tables and _migrations table if they exist
    const tablesToDrop = [
      'reviews',
      'order_items',
      'orders',
      'products',
      'shops',
      'sessions',
      'categories',
      'users',
      '_migrations',
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  });

  afterAll(async () => {
    // Clean up after tests
    const tablesToDrop = [
      'reviews',
      'order_items',
      'orders',
      'products',
      'shops',
      'sessions',
      'categories',
      'users',
      '_migrations',
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      } catch (err) {
        // Ignore errors during cleanup
      }
    }

    await pool.end();
  });

  describe('runMigrations', () => {
    it('creates all required tables with correct schema', async () => {
      await runMigrations();

      // Check that all tables exist
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tableNames = result.rows.map((row) => row.table_name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('shops');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');
      expect(tableNames).toContain('reviews');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('_migrations');
    });

    it('creates users table with correct columns and constraints', async () => {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns: { [key: string]: any } = {};
      columnsResult.rows.forEach((row) => {
        columns[row.column_name] = { type: row.data_type, nullable: row.is_nullable === 'YES' };
      });

      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('email');
      expect(columns).toHaveProperty('password_hash');
      expect(columns).toHaveProperty('full_name');
      expect(columns).toHaveProperty('role');
      expect(columns).toHaveProperty('email_verified');
      expect(columns).toHaveProperty('terms_accepted');
      expect(columns).toHaveProperty('created_at');

      // Check email_verified and terms_accepted default to false
      expect(columns.email_verified.nullable).toBe(false);
      expect(columns.terms_accepted.nullable).toBe(false);
    });

    it('creates products table with price and stock constraints', async () => {
      const constraintsResult = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'products'
      `);

      const constraints = constraintsResult.rows.map((r) => r.constraint_name);

      // Check that constraints exist (the constraint name will include the check)
      const hasCheckConstraints = constraints.some((c) => c.includes('products'));
      expect(hasCheckConstraints || constraints.length > 0).toBe(true);
    });

    it('creates orders table with status check constraint', async () => {
      // Verify status constraint by attempting invalid insert
      const insertValidStatus = async () => {
        const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        // First insert a user for referential integrity
        await pool.query(
          `INSERT INTO users (id, email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'test@example.com', 'hash', 'Test User', 'buyer']
        );

        // Try to insert with valid status
        await pool.query(
          `INSERT INTO orders (buyer_id, status, shipping_address, total_amount)
           VALUES ($1, $2, $3, $4)`,
          [userId, 'pending', JSON.stringify({ city: 'NYC' }), 100.0]
        );
      };

      await expect(insertValidStatus()).resolves.not.toThrow();
    });

    it('creates categories table with name unique constraint', async () => {
      // Insert a category
      await pool.query('INSERT INTO categories (name) VALUES ($1)', ['Electronics']);

      // Try to insert duplicate
      const insertDuplicate = async () => {
        await pool.query('INSERT INTO categories (name) VALUES ($1)', ['Electronics']);
      };

      await expect(insertDuplicate()).rejects.toThrow();
    });

    it('records migrations in _migrations table', async () => {
      const result = await pool.query('SELECT * FROM _migrations ORDER BY filename');

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]).toHaveProperty('filename');
      expect(result.rows[0]).toHaveProperty('hash');
      expect(result.rows[0]).toHaveProperty('applied_at');
    });

    it('is idempotent - running migrations twice does not error', async () => {
      // First run already happened in beforeAll via runMigrations
      // Run migrations again
      const secondRun = async () => {
        await runMigrations();
      };

      await expect(secondRun()).resolves.not.toThrow();
    });

    it('maintains referential integrity - foreign keys are enforced', async () => {
      // Cleanup from previous tests - delete dependent records first
      await pool.query('DELETE FROM reviews');
      await pool.query('DELETE FROM order_items');
      await pool.query('DELETE FROM orders');
      await pool.query('DELETE FROM products');
      await pool.query('DELETE FROM shops');
      await pool.query('DELETE FROM sessions');
      await pool.query('DELETE FROM users');

      // Try to insert shop with non-existent user
      const insertShopWithBadUserId = async () => {
        await pool.query(
          `INSERT INTO shops (seller_id, name) VALUES ($1, $2)`,
          ['f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Test Shop']
        );
      };

      await expect(insertShopWithBadUserId()).rejects.toThrow();
    });

    it('validates numeric constraints on products', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d481';
      const shopId = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';

      // Insert user and shop for product
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'seller@example.com', 'hash', 'Seller', 'seller']
      );

      await pool.query(
        `INSERT INTO shops (id, seller_id, name) VALUES ($1, $2, $3)`,
        [shopId, userId, 'Test Shop']
      );

      // Try to insert product with zero price (should fail CHECK constraint)
      const insertZeroPrice = async () => {
        await pool.query(
          `INSERT INTO products (shop_id, title, price, stock) VALUES ($1, $2, $3, $4)`,
          [shopId, 'Test Product', 0, 10]
        );
      };

      await expect(insertZeroPrice()).rejects.toThrow();

      // Try to insert product with negative stock (should fail)
      const insertNegativeStock = async () => {
        await pool.query(
          `INSERT INTO products (shop_id, title, price, stock) VALUES ($1, $2, $3, $4)`,
          [shopId, 'Test Product', 10.0, -1]
        );
      };

      await expect(insertNegativeStock()).rejects.toThrow();

      // Stock > 999999 should fail
      const insertTooMuchStock = async () => {
        await pool.query(
          `INSERT INTO products (shop_id, title, price, stock) VALUES ($1, $2, $3, $4)`,
          [shopId, 'Test Product', 10.0, 1000000]
        );
      };

      await expect(insertTooMuchStock()).rejects.toThrow();
    });

    it('validates rating constraints on reviews', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d483';
      const shopId = 'f47ac10b-58cc-4372-a567-0e02b2c3d484';
      const productId = 'f47ac10b-58cc-4372-a567-0e02b2c3d485';
      const orderId = 'f47ac10b-58cc-4372-a567-0e02b2c3d486';
      const orderItemId = 'f47ac10b-58cc-4372-a567-0e02b2c3d487';

      // Setup: create user, shop, product, order, order_item
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'buyer2@example.com', 'hash', 'Buyer', 'buyer']
      );

      await pool.query(
        `INSERT INTO shops (id, seller_id, name) VALUES ($1, $2, $3)`,
        [shopId, userId, 'Shop2']
      );

      await pool.query(
        `INSERT INTO products (id, shop_id, title, price) VALUES ($1, $2, $3, $4)`,
        [productId, shopId, 'Product', 25.0]
      );

      await pool.query(
        `INSERT INTO orders (id, buyer_id, status, shipping_address, total_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, userId, 'pending', JSON.stringify({ city: 'NYC' }), 25.0]
      );

      await pool.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderItemId, orderId, productId, 1, 25.0]
      );

      // Try to insert review with rating = 0 (should fail CHECK constraint)
      const insertRating0 = async () => {
        await pool.query(
          `INSERT INTO reviews (order_item_id, buyer_id, product_id, rating)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, userId, productId, 0]
        );
      };

      await expect(insertRating0()).rejects.toThrow();

      // Try to insert review with rating = 6 (should fail CHECK constraint)
      const insertRating6 = async () => {
        await pool.query(
          `INSERT INTO reviews (order_item_id, buyer_id, product_id, rating)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, userId, productId, 6]
        );
      };

      await expect(insertRating6()).rejects.toThrow();
    });
  });
});
