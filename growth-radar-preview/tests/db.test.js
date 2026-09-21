import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { addRecord, deleteRecord, loadSnapshot, openGrowthRadarDb, seedIfEmpty } from '../src/data/db.js';

const databases = [];

async function createDb() {
  const name = `growth-radar-test-${crypto.randomUUID()}`;
  databases.push(name);
  return openGrowthRadarDb({ indexedDBImpl: indexedDB, name });
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((name) => new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = resolve;
  })));
});

describe('IndexedDB repository', () => {
  it('只在空数据库创建一次默认阶段与六个方向', async () => {
    const db = await createDb();
    expect(await seedIfEmpty(db, new Date('2026-09-21T08:00:00+08:00'))).toBe(true);
    expect(await seedIfEmpty(db, new Date('2026-09-22T08:00:00+08:00'))).toBe(false);
    const snapshot = await loadSnapshot(db);
    expect(snapshot.stages).toHaveLength(1);
    expect(snapshot.dimensions).toHaveLength(6);
    expect(snapshot.records).toHaveLength(0);
    db.close();
  });

  it('每次记录独立保存且可以只删除目标记录', async () => {
    const db = await createDb();
    await seedIfEmpty(db);
    const dimensionId = (await loadSnapshot(db)).dimensions[0].id;
    const first = await addRecord(db, dimensionId, new Date('2026-09-21T08:00:00+08:00'));
    const second = await addRecord(db, dimensionId, new Date('2026-09-21T09:00:00+08:00'));
    expect(first.id).not.toBe(second.id);
    await deleteRecord(db, first.id);
    const snapshot = await loadSnapshot(db);
    expect(snapshot.records.map((record) => record.id)).toEqual([second.id]);
    db.close();
  });
});
