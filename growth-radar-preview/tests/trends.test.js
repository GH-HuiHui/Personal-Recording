import { describe, expect, it } from 'vitest';
import { getMonthKey, monthRange } from '../src/domain/trends.js';

const at = (day, hour = 12) => new Date(2026, 8, day, hour).toISOString();
const stage = (id, name, start, end = null) => ({ id, name, createdAt: at(start), endedAt: end && at(end), status: end ? 'archived' : 'active' });
const dimension = (id, stageId, name, sortOrder = 0, isEnabled = true) => ({ id, stageId, name, sortOrder, isEnabled });
const record = (id, stageId, dimensionId, day) => ({ id, stageId, dimensionId, createdAt: at(day) });

describe('月度趋势', () => {
  it('使用本地自然月，当月截止今天且不把未来日计为零', () => {
    expect(getMonthKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
    const result = monthRange({ stages: [stage('s', '阶段', 28)], dimensions: [dimension('d', 's', '阅读')], records: [] }, '2026-09', new Date(2026, 8, 30));
    expect(result.days).toHaveLength(30);
    expect(result.rows.map((row) => row.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    expect(result.nextMonth).toBeNull();
  });

  it('跨阶段同日准确求和，归档与重名方向保持独立', () => {
    const snapshot = {
      stages: [stage('a', '阶段', 1, 15), stage('b', '阶段', 15)],
      dimensions: [dimension('x', 'a', '阅读', 0, false), dimension('y', 'b', '阅读')],
      records: [record('r1', 'a', 'x', 15), record('r2', 'b', 'y', 15), record('r3', 'b', 'y', 15)]
    };
    const result = monthRange(snapshot, '2026-09', new Date(2026, 8, 30));
    expect(result.days.find((day) => day.date === '2026-09-15')?.count).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.activeDays).toBe(1);
    expect(result.rows.filter((row) => row.date === '2026-09-15')).toEqual([
      { date: '2026-09-15', stageOrder: 1, stageName: '阶段', dimensionOrder: 1, dimensionName: '阅读', count: 1 },
      { date: '2026-09-15', stageOrder: 2, stageName: '阶段', dimensionOrder: 1, dimensionName: '阅读', count: 2 }
    ]);
  });

  it('空月份输出真实零值，月份边界不越过阶段开始月', () => {
    const result = monthRange({ stages: [stage('s', '阶段', 20)], dimensions: [dimension('d', 's', '阅读')], records: [] }, '2026-09', new Date(2026, 8, 23));
    expect(result.totalCount).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.days).toHaveLength(23);
    expect(result.rows).toHaveLength(4);
    expect(result.previousMonth).toBeNull();
  });
});
