import { indexedDB } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { openGrowthRadarDb, seedIfEmpty, loadSnapshot, addRecord } from '../src/data/db.js';
import { addDimension, archiveAndCreateStage, editDimension, renameStage } from '../src/data/stages.js';

it('方向管理保留记录，归档原子切换阶段且旧方向禁止记录', async () => {
  const db = await openGrowthRadarDb({ indexedDBImpl: indexedDB, name: crypto.randomUUID() });
  await seedIfEmpty(db);
  await renameStage(db, '第一阶段');
  await addDimension(db, '<学习>');
  const before = await loadSnapshot(db);
  const dimension = before.dimensions[0];
  await addRecord(db, dimension.id);
  await editDimension(db, dimension.id, '学习', false);
  expect((await loadSnapshot(db)).records).toHaveLength(1);
  await expect(archiveAndCreateStage(db, '下一阶段', [])).rejects.toThrow('3～8');
  expect((await loadSnapshot(db)).stages).toHaveLength(1);
  await archiveAndCreateStage(db, '下一阶段', before.dimensions.map((item) => item.id));
  const after = await loadSnapshot(db);
  expect(after.stages.filter((item) => item.status === 'active')).toHaveLength(1);
  expect(after.records).toHaveLength(1);
  const current = after.stages.find((item) => item.status === 'active');
  const newDirections = after.dimensions.filter((item) => item.stageId === current.id).toSorted((a,b) => a.sortOrder - b.sortOrder);
  const oldDirections = (await loadSnapshot(db)).dimensions.filter((item) => item.stageId !== current.id).toSorted((a,b) => a.sortOrder - b.sortOrder);
  expect(newDirections.map((item) => item.name)).toEqual(oldDirections.map((item) => item.name));
  await expect(addRecord(db, before.dimensions[1].id)).rejects.toThrow('已归档');
  db.close();
});
