import { describe, expect, it } from 'vitest';
import { createRadarMarkup } from '../src/ui/radar.js';
import { escapeHtml } from '../src/ui/safe-html.js';
import { createDimensionRows } from '../src/ui/today.js';

const stats = [
  { id: 'a', name: '阅读', icon: 'book-2', todayCount: 1, recentCount: 3, activeDays: 2, stageRate: 0.5 },
  { id: 'b', name: '技术', icon: 'code', todayCount: 0, recentCount: 2, activeDays: 1, stageRate: 0.25 },
  { id: 'c', name: '健康', icon: 'barbell', todayCount: 0, recentCount: 1, activeDays: 1, stageRate: 0.25 }
];

describe('安全 UI 渲染', () => {
  it('转义可变文本，避免导入数据注入 HTML', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    const rows = createDimensionRows([{ ...stats[0], name: '<script>alert(1)</script>' }]);
    expect(rows).not.toContain('<script>');
    expect(rows).toContain('&lt;script&gt;');
  });

  it('方向列表包含真实统计和可访问记录按钮', () => {
    const rows = createDimensionRows(stats, 'a');
    expect(rows).toContain('今日 1 次');
    expect(rows).toContain('近 7 日 3 次');
    expect(rows).toContain('aria-label="记录一次阅读"');
    expect(rows).toContain('is-recorded');
  });

  it('雷达图支持近期与阶段两种统计', () => {
    expect(createRadarMarkup(stats, 'recent')).toContain('>7</text>');
    expect(createRadarMarkup(stats, 'stage')).toContain('>100</text>');
  });
});
