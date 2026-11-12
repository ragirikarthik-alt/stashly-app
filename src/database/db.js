import { open } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';

const DB_NAME = 'stashly.sqlite';
let db = null;

export function getDb() {
  if (!db) {
    db = open({ name: DB_NAME });
  }
  return db;
}

export async function initDatabase() {
  const d = getDb();
  await d.execute('PRAGMA journal_mode = WAL');
  await d.execute('PRAGMA foreign_keys = ON');
  const res = await d.execute('PRAGMA user_version');
  const current = Number(res.rows?.[0]?.user_version ?? 0);
  for (let v = current; v < MIGRATIONS.length; v++) {
    await d.transaction(async tx => {
      for (const sql of MIGRATIONS[v]) {
        await tx.execute(sql);
      }
      await tx.execute(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return d;
}

/** Run multiple writes atomically. */
export function withTransaction(fn) {
  return getDb().transaction(fn);
}
