import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup, normalizeSnapshot } from '../src/data/backup.js';
import { loadSnapshot, openGrowthRadarDb, replaceDatabase, seedIfEmpty } from '../src/data/db.js';

const password = '正确的长密码-2026';
const snapshot = {
  stages: [{ id: 's1', name: '阶段 1', createdAt: '2026-09-21T00:00:00.000Z', endedAt: null, status: 'active' }],
  dimensions: [{ id: 'd1', stageId: 's1', name: '阅读', icon: 'book-2', sortOrder: 0, isEnabled: true }],
  records: [{ id: 'r1', stageId: 's1', dimensionId: 'd1', createdAt: '2026-09-21T08:00:00.000Z' }]
};
const databases = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((name) => new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = resolve;
  })));
});

describe('加密备份', () => {
  it('正确密码可以完整往返且文件不含明文', async () => {
    const encrypted = await encryptBackup(snapshot, password);
    expect(encrypted).not.toContain('阅读');
    expect(await decryptBackup(encrypted, password)).toEqual(snapshot);
  });

  it('错误密码和篡改密文都会失败', async () => {
    const encrypted = await encryptBackup(snapshot, password);
    await expect(decryptBackup(encrypted, '错误的长密码-2026')).rejects.toThrow('密码错误或备份文件已损坏');
    const envelope = JSON.parse(encrypted);
    envelope.data = `${envelope.data.slice(0, -4)}AAAA`;
    await expect(decryptBackup(envelope, password)).rejects.toThrow('密码错误或备份文件已损坏');
  });

  it('拒绝关联错误和带脚本的异常数据', () => {
    expect(() => normalizeSnapshot({ ...snapshot, records: [{ ...snapshot.records[0], dimensionId: 'missing' }] })).toThrow('不存在');
    expect(normalizeSnapshot({ ...snapshot, dimensions: [{ ...snapshot.dimensions[0], name: '<script>' }] }).dimensions[0].name).toBe('<script>');
  });

  it('事务恢复失败会保留原数据库', async () => {
    const name = `backup-test-${crypto.randomUUID()}`;
    databases.push(name);
    const db = await openGrowthRadarDb({ indexedDBImpl: indexedDB, name });
    await seedIfEmpty(db);
    const before = await loadSnapshot(db);
    await expect(replaceDatabase(db, { ...snapshot, stages: [snapshot.stages[0], snapshot.stages[0]] })).rejects.toBeTruthy();
    expect(await loadSnapshot(db)).toEqual(before);
    db.close();
  });
});
