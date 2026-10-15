import { expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { loadSnapshot, openGrowthRadarDb, seedIfEmpty, addRecord } from '../src/data/db.js';
import { archiveAndCreateStage, reorderDimensions, saveChartPreferences, editDimension } from '../src/data/stages.js';
import { decryptBackup, encryptBackup, normalizeSnapshot } from '../src/data/backup.js';
import { summarizeStage } from '../src/domain/stage-summary.js';
import { createStageDetails } from '../src/ui/stage-details.js';
import { createBarMarkup } from '../src/ui/chart.js';
import { saveFile } from '../src/data/save-file.js';

it('排序原子保存，拒绝重复、缺失和已归档方向；继承图表与图标且保留历史', async () => {
  const db = await openGrowthRadarDb({ indexedDBImpl: indexedDB, name: crypto.randomUUID() });
  try {
    await seedIfEmpty(db, new Date('2026-10-01T00:00:00Z'));
    const before = await loadSnapshot(db);
    const ids = before.dimensions.toSorted((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id).reverse();
    await addRecord(db, ids[0], new Date('2026-10-02T00:00:00Z'));
    await reorderDimensions(db, ids);
    const sorted = await loadSnapshot(db);
    expect(sorted.dimensions.toSorted((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id)).toEqual(ids);
    for (const invalid of [ids.slice(1), [...ids.slice(1), ids[1]], [...ids.slice(1), 'foreign']]) {
      await expect(reorderDimensions(db, invalid)).rejects.toThrow('顺序无效');
      expect(await loadSnapshot(db)).toEqual(sorted);
    }
    const item = before.dimensions.find((entry) => entry.id === ids[0]);
    await editDimension(db, item.id, item.name, true, 'code');
    const preferences = { type: 'bars', color: 'purple', showValues: false };
    await saveChartPreferences(db, preferences);
    const configured = await loadSnapshot(db);
    expect(await decryptBackup(await encryptBackup(configured, 'test-password-2026'), 'test-password-2026')).toEqual(configured);
    await archiveAndCreateStage(db, '第二阶段', ids, new Date('2026-10-10T00:00:00Z'));
    const after = await loadSnapshot(db);
    const archived = after.stages.find((entry) => entry.status === 'archived');
    const active = after.stages.find((entry) => entry.status === 'active');
    expect(active.chartPreferences).toEqual(preferences);
    expect(after.dimensions.filter((entry) => entry.stageId === active.id).toSorted((a, b) => a.sortOrder - b.sortOrder)[0].icon).toBe('code');
    await expect(reorderDimensions(db, ids)).rejects.toThrow('顺序无效');
    await saveChartPreferences(db, { type: 'radar', color: 'blue', showValues: true });
    expect((await loadSnapshot(db)).stages.find((entry) => entry.id === archived.id)).toEqual(archived);
    expect(after.records).toHaveLength(1);
    expect(() => normalizeSnapshot({ ...configured, stages: configured.stages.map((entry) => ({ ...entry, chartPreferences: { ...preferences, color: 'url(x)' } })) })).toThrow('图表设置');
  } finally { db.close(); }
});

const stage = { id: 's', name: '第一阶段', createdAt: '2026-10-01T00:00:00Z', endedAt: '2026-10-10T00:00:00Z', status: 'archived' };
const snapshot = {
  stages: [stage],
  dimensions: [{ id: 'a', stageId: 's', name: '<阅读>', isEnabled: false, sortOrder: 1 }, { id: 'b', stageId: 's', name: '技术', isEnabled: true, sortOrder: 0 }],
  records: [
    { stageId: 's', dimensionId: 'a', createdAt: '2026-10-02T00:00:00Z' },
    { stageId: 's', dimensionId: 'a', createdAt: '2026-10-02T01:00:00Z' },
    { stageId: 's', dimensionId: 'a', createdAt: '2026-10-03T00:00:00Z' },
    { stageId: 'other', dimensionId: 'b', createdAt: '2026-10-03T00:00:00Z' }
  ]
};

it('阶段总结冻结结束日、包含停用方向，并按本地自然日汇总明细', () => {
  const result = summarizeStage(snapshot, stage, new Date('2027-01-01T00:00:00Z'));
  expect(result).toMatchObject({ total: 3, activeDays: 2, duration: 10 });
  expect(result.directions[1]).toMatchObject({ count: 3, activeDays: 2, rate: 20 });
  expect(result.daily.map((row) => row.count)).toEqual([1, 2]);
  expect(result).toEqual(summarizeStage(snapshot, stage, new Date('2028-01-01T00:00:00Z')));
  const markup = createStageDetails(snapshot, stage);
  expect(markup).toContain('&lt;阅读&gt;（已停用）');
  expect(markup).not.toContain('<阅读>');
  expect(markup).toContain('每日明细');
  expect(markup).toContain('活跃率 20%');
  expect(createStageDetails({ ...snapshot, records: [] }, stage)).toContain('这个阶段还没有行动记录');
});

it('条形图遵循顺序、展示真实数值，关闭数值仍有可访问描述', () => {
  const stats = [{ name: '技术', activeDays: 3, stageRate: 0.5 }, { name: '<阅读>', activeDays: 0, stageRate: 0 }];
  const markup = createBarMarkup(stats, 'recent', { showValues: true });
  expect(markup.indexOf('技术')).toBeLessThan(markup.indexOf('&lt;阅读&gt;'));
  expect(markup).toContain('3 天');
  expect(createBarMarkup(stats, 'stage', { showValues: false })).toContain('aria-label="技术：50%"');
  expect(createBarMarkup(stats, 'stage', { showValues: false })).not.toContain('<strong>');
});

it('保存选择器在点击时打开，并把完整加密文件写入设备', async () => {
  const file = new File(['encrypted'], 'backup.growthradar');
  const stream = { write: vi.fn(), close: vi.fn() };
  const picker = vi.fn().mockResolvedValue({ createWritable: async () => stream });
  const result = saveFile(file, { browser: { showSaveFilePicker: picker } });
  expect(picker).toHaveBeenCalledWith({ suggestedName: file.name });
  expect(await result).toBe('saved');
  expect(stream.write).toHaveBeenCalledWith(file);
  expect(stream.close).toHaveBeenCalledOnce();
});

it('iPhone 文件分享保留点击手势，取消不会偷偷下载', async () => {
  const file = new File(['encrypted'], 'backup.growthradar');
  const share = vi.fn().mockResolvedValue();
  const options = { browser: {}, nav: { canShare: () => true, share } };
  const result = saveFile(file, options);
  expect(share).toHaveBeenCalledWith({ files: [file], title: '成长雷达备份' });
  expect(await result).toBe('shared');
  share.mockRejectedValueOnce(new DOMException('cancel', 'AbortError'));
  await expect(saveFile(file, options)).rejects.toMatchObject({ name: 'AbortError' });
});

it('直接下载绕过应用路由，并延迟释放文件地址', async () => {
  const link = { click: vi.fn(), remove: vi.fn() };
  const browser = { showSaveFilePicker: vi.fn(), setTimeout: vi.fn() };
  const urls = { createObjectURL: () => 'blob:backup', revokeObjectURL: vi.fn() };
  const file = new File(['encrypted'], 'backup.growthradar');
  const result = await saveFile(file, { directDownload: true, browser, nav: {}, doc: { createElement: () => link, body: { append: vi.fn() } }, urls });
  expect(result).toBe('downloaded');
  expect(browser.showSaveFilePicker).not.toHaveBeenCalled();
  expect(link).toMatchObject({ className: 'external', href: 'blob:backup', download: file.name });
  expect(link.click).toHaveBeenCalledOnce();
  expect(urls.revokeObjectURL).not.toHaveBeenCalled();
  browser.setTimeout.mock.calls[0][0]();
  expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
});

it('条形模式通过 SVG 属性隐藏旧图表，避免重复显示', async () => {
  const { renderGrowthChart } = await import('../src/ui/chart.js');
  const svg = { closest: () => ({ style: { setProperty: vi.fn() } }), toggleAttribute: vi.fn() };
  const bars = { hidden: true, innerHTML: '' };
  renderGrowthChart(svg, bars, [], 'recent', { type: 'bars', color: 'blue', showValues: true });
  expect(svg.toggleAttribute).toHaveBeenCalledWith('hidden', true);
  expect(bars.hidden).toBe(false);
});
