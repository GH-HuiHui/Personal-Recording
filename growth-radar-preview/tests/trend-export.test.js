import { expect, it } from 'vitest';
import { createTrendCsv } from '../src/data/trend-export.js';

it('CSV 保留中文、重名序号和 Excel 兼容换行', () => {
  const csv = createTrendCsv([
    { date: '2026-09-15', stageOrder: 2, stageName: '第二阶段', dimensionOrder: 1, dimensionName: '阅读', count: 3 }
  ]);
  expect(csv.startsWith('\ufeff日期,阶段序号,阶段,方向序号,方向,次数\r\n')).toBe(true);
  expect(csv).toContain('2026-09-15,2,第二阶段,1,阅读,3\r\n');
});

it('CSV 正确转义逗号与引号，并阻止名称被表格软件当成公式', () => {
  const csv = createTrendCsv([
    { date: '2026-09-15', stageOrder: 1, stageName: '=HYPERLINK("x","y")', dimensionOrder: 2, dimensionName: '+技术,学习', count: 1 }
  ]);
  expect(csv).toContain('"\'=HYPERLINK(""x"",""y"")"');
  expect(csv).toContain("'+技术,学习");
  expect(csv).not.toContain('2026-09-15,1,=HYPERLINK');
});
