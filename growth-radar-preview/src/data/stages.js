const ICONS = new Set(['book-2', 'language', 'code', 'barbell', 'pencil', 'microphone-2']);
const nameOf = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 24) throw new Error('名称需要 1～24 个字符');
  return value.trim();
};

function change(db, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['stages', 'dimensions', 'records'], 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('修改未保存'));
    tx.onerror = () => {};
    const request = tx.objectStore('stages').getAll();
    request.onsuccess = () => {
      const stage = request.result.find((item) => item.status === 'active');
      if (!stage) { tx.abort(); return; }
      const directions = tx.objectStore('dimensions').getAll();
      directions.onsuccess = () => {
        try { operation(tx, stage, directions.result.filter((item) => item.stageId === stage.id)); }
        catch (error) { tx.abort(); reject(error); }
      };
    };
  });
}

export function renameStage(db, name) {
  const clean = nameOf(name);
  return change(db, (tx, stage) => tx.objectStore('stages').put({ ...stage, name: clean }));
}

export function addDimension(db, name, icon = 'book-2') {
  const clean = nameOf(name);
  if (!ICONS.has(icon)) throw new Error('图标无效');
  return change(db, (tx, stage, dimensions) => {
    if (dimensions.filter((item) => item.isEnabled).length >= 8) throw new Error('最多显示 8 个方向');
    tx.objectStore('dimensions').add({ id: crypto.randomUUID(), stageId: stage.id, name: clean, icon, sortOrder: dimensions.length, isEnabled: true });
  });
}

export function editDimension(db, id, name, enabled) {
  const clean = nameOf(name);
  return change(db, (tx, _stage, dimensions) => {
    const item = dimensions.find((dimension) => dimension.id === id);
    if (!item) throw new Error('方向不存在');
    const count = dimensions.filter((dimension) => dimension.id !== id && dimension.isEnabled).length + Number(enabled);
    if (count < 3 || count > 8) throw new Error('请保留 3～8 个显示方向');
    // Disable rather than delete: original action facts remain in the database.
    tx.objectStore('dimensions').put({ ...item, name: clean, isEnabled: enabled });
  });
}

export function archiveAndCreateStage(db, name, selectedIds, now = new Date()) {
  const clean = nameOf(name);
  return change(db, (tx, stage, dimensions) => {
    const selected = dimensions.filter((item) => selectedIds.includes(item.id)).toSorted((a, b) => a.sortOrder - b.sortOrder);
    if (selected.length < 3 || selected.length > 8) throw new Error('新阶段需要 3～8 个方向');
    const createdAt = now.toISOString();
    const id = crypto.randomUUID();
    tx.objectStore('stages').put({ ...stage, status: 'archived', endedAt: createdAt });
    tx.objectStore('stages').add({ id, name: clean, createdAt, endedAt: null, status: 'active' });
    selected.forEach((item, sortOrder) => tx.objectStore('dimensions').add({ ...item, id: crypto.randomUUID(), stageId: id, sortOrder, isEnabled: true }));
  });
}
