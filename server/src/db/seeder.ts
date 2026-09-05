import { pool } from './index';
import * as s001 from './seeders/001_seed_initial_data';

const seeders = [s001];

export async function runSeeders() {
  const client = await pool.connect();
  try {
    for (const seeder of seeders) {
      console.log(`[Seeder] Running: ${seeder.id}...`);
      await client.query('BEGIN');
      try {
        await seeder.seed(client);
        await client.query('COMMIT');
        console.log(`\x1b[32m[Seeder] Completed:\x1b[0m ${seeder.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

export async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB Reset] Truncating all data tables...');
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE articles, tags, users RESTART IDENTITY CASCADE;');
    await client.query('COMMIT');
    console.log('\x1b[33m[DB Reset] All tables truncated successfully.\x1b[0m');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Re-run seeders
  await runSeeders();
}

// CLI runner
if (require.main === module) {
  const isReset = process.argv.includes('--reset');
  const action = isReset ? resetDatabase() : runSeeders();
  action
    .then(() => {
      console.log('\x1b[32m[Database Seeder] Done!\x1b[0m');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder Error]', err);
      process.exit(1);
    });
}
