import { createInitialData } from './seed.js';

const DB_NAME = 'growth-radar';
const DB_VERSION = 1;
export const STORE_NAMES = Object.freeze(['stages', 'dimensions', 'records']);

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', resolve, { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error || new Error('数据库事务已取消')), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error || new Error('数据库事务失败')), { once: true });
  });
}

export function openGrowthRadarDb({ indexedDBImpl = globalThis.indexedDB, name = DB_NAME } = {}) {
  if (!indexedDBImpl) return Promise.reject(new Error('当前浏览器不支持本地数据库'));

  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(name, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('stages')) db.createObjectStore('stages', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('dimensions')) {
        const store = db.createObjectStore('dimensions', { keyPath: 'id' });
        store.createIndex('stageId', 'stageId', { unique: false });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('dimensionId', 'dimensionId', { unique: false });
        store.createIndex('stageId', 'stageId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
    request.addEventListener('blocked', () => reject(new Error('本地数据库升级被其他页面阻止')), { once: true });
  });
}

export async function seedIfEmpty(db, now = new Date()) {
  const write = db.transaction(['stages', 'dimensions'], 'readwrite');
  const done = transactionDone(write);
  const count = await requestResult(write.objectStore('stages').count());
  if (count > 0) { await done; return false; }
  const { stage, dimensions } = createInitialData(now);
  write.objectStore('stages').add(stage);
  const dimensionStore = write.objectStore('dimensions');
  dimensions.forEach((dimension) => dimensionStore.add(dimension));
  await done;
  return true;
}

export async function addRecord(db, dimensionId, now = new Date()) {
  const transaction = db.transaction(['stages', 'dimensions', 'records'], 'readwrite');
  const dimension = await requestResult(transaction.objectStore('dimensions').get(dimensionId));
  if (!dimension || !dimension.isEnabled) {
    transaction.abort();
    throw new Error('成长方向不存在或已停用');
  }
  const stage = await requestResult(transaction.objectStore('stages').get(dimension.stageId));
  if (stage?.status !== 'active') {
    transaction.abort();
    throw new Error('已归档阶段不能继续记录');
  }
  const record = {
    id: crypto.randomUUID(),
    stageId: dimension.stageId,
    dimensionId,
    createdAt: now.toISOString()
  };
  transaction.objectStore('records').add(record);
  await transactionDone(transaction);
  return record;
}

export async function deleteRecord(db, recordId) {
  const transaction = db.transaction('records', 'readwrite');
  transaction.objectStore('records').delete(recordId);
  await transactionDone(transaction);
}

export async function loadSnapshot(db) {
  const transaction = db.transaction(STORE_NAMES, 'readonly');
  const [stages, dimensions, records] = await Promise.all(
    STORE_NAMES.map((name) => requestResult(transaction.objectStore(name).getAll()))
  );
  await transactionDone(transaction);
  return { stages, dimensions, records };
}

export async function clearDatabase(db) {
  const transaction = db.transaction(STORE_NAMES, 'readwrite');
  STORE_NAMES.forEach((name) => transaction.objectStore(name).clear());
  await transactionDone(transaction);
}

export async function replaceDatabase(db, snapshot) {
  const transaction = db.transaction(STORE_NAMES, 'readwrite');
  STORE_NAMES.forEach((name) => transaction.objectStore(name).clear());
  snapshot.stages.forEach((stage) => transaction.objectStore('stages').add(stage));
  snapshot.dimensions.forEach((dimension) => transaction.objectStore('dimensions').add(dimension));
  snapshot.records.forEach((record) => transaction.objectStore('records').add(record));
  await transactionDone(transaction);
}
