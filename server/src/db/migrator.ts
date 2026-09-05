import { pool, ensureDatabaseExists } from './index';
import * as m001 from './migrations/001_create_initial_tables';

const migrations = [m001];

export async function runMigrations() {
  await ensureDatabaseExists();
  const client = await pool.connect();

  try {
    // 1. Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Fetch executed migrations
    const res = await client.query('SELECT id FROM _migrations');
    const executedIds = new Set(res.rows.map((r) => r.id));

    // 3. Execute pending migrations
    let executedCount = 0;
    for (const migration of migrations) {
      if (!executedIds.has(migration.id)) {
        console.log(`[Migration] Running: ${migration.id}...`);
        await client.query('BEGIN');
        try {
          await migration.up(client);
          await client.query('INSERT INTO _migrations (id) VALUES ($1)', [migration.id]);
          await client.query('COMMIT');
          console.log(`\x1b[32m[Migration] Completed:\x1b[0m ${migration.id}`);
          executedCount++;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    }

    if (executedCount === 0) {
      console.log('[Migration] Database schema is up to date.');
    }
  } finally {
    client.release();
  }
}

export async function rollbackMigrations() {
  await ensureDatabaseExists();
  const client = await pool.connect();

  try {
    // Run down in reverse order
    for (const migration of [...migrations].reverse()) {
      console.log(`[Migration Rollback] Rolling back: ${migration.id}...`);
      await client.query('BEGIN');
      try {
        await migration.down(client);
        await client.query('DELETE FROM _migrations WHERE id = $1', [migration.id]);
        await client.query('COMMIT');
        console.log(`\x1b[33m[Migration Rollback] Completed:\x1b[0m ${migration.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

// CLI runner
if (require.main === module) {
  const isRollback = process.argv.includes('--rollback');
  const action = isRollback ? rollbackMigrations() : runMigrations();
  action
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration Error]', err);
      process.exit(1);
    });
}
