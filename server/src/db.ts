import { pool, ensureDatabaseExists } from './db/index';
import { runMigrations } from './db/migrator';
import { runSeeders } from './db/seeder';

export { pool, ensureDatabaseExists };

export async function initDb() {
  await runMigrations();
  await runSeeders();
}
