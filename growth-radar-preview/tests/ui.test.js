import { describe, expect, it } from 'vitest';
import { createRadarMarkup } from '../src/ui/radar.js';
import { escapeHtml } from '../src/ui/safe-html.js';
import { createDimensionRows } from '../src/ui/today.js';
import { interpolatePoints } from '../src/ui/radar-motion.js';
import { createTrendMarkup } from '../src/ui/trends.js';

const stats = [
  { id: 'a', name: '阅读', icon: 'book-2', todayCount: 1, recentCount: 3, activeDays: 2, stageRate: 0.5 },
  { id: 'b', name: '技术', icon: 'code', todayCount: 0, recentCount: 2, activeDays: 1, stageRate: 0.25 },
  { id: 'c', name: '健康', icon: 'barbell', todayCount: 0, recentCount: 1, activeDays: 1, stageRate: 0.25 }
];

describe('安全 UI 渲染', () => {
  it('图表插值保留端点，方向数量变化时不产生无效坐标', () => {
    expect(interpolatePoints('0,0 10,10', '10,10 20,20', 0.5)).toBe('5,5 15,15');
    expect(interpolatePoints('0,0 10,10', '10,10 20,20', 1)).toBe('10,10 20,20');
    expect(interpolatePoints('0,0', '10,10 20,20', 0.5)).toBe('10,10 20,20');
  });
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
    expect(createRadarMarkup(stats, 'recent')).toContain('活跃天数 · 0–7 天');
    expect(createRadarMarkup(stats, 'stage')).toContain('阶段活跃率 · 0–100%');
    expect(createRadarMarkup(stats, 'recent')).not.toContain('scale-label');
  });
});

describe('月度趋势界面', () => {
  it('展示真实统计、日期范围与明确的导出入口', () => {
    const markup = createTrendMarkup({
      days: [{ date: '2026-09-01', count: 2 }, { date: '2026-09-02', count: 0 }],
      totalCount: 2, activeDays: 1, previousMonth: '2026-08', nextMonth: null
    }, '2026-09');
    expect(markup).toContain('2026 年 9 月');
    expect(markup).toContain('2 次记录 · 1 个活跃日');
    expect(markup).toContain('导出趋势图');
    expect(markup).toContain('导出 CSV');
    expect(markup).toContain('9月1日 2次');
    expect(markup).toContain('disabled');
  });

  it('零数据给出明确提示，不生成虚构柱形', () => {
    const markup = createTrendMarkup({
      days: [{ date: '2026-09-01', count: 0 }], totalCount: 0, activeDays: 0,
      previousMonth: null, nextMonth: null
    }, '2026-09');
    expect(markup).toContain('这个月还没有行动记录');
    expect(markup).not.toContain('class="trend-bar"');
  });
});
