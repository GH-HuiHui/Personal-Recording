import { describe, expect, it } from 'vitest';
import { calculateDimensionStats } from '../src/domain/analytics.js';

const dimension = { id: 'reading', stageId: 'stage-1', name: '阅读', sortOrder: 0, isEnabled: true };
const stage = { id: 'stage-1', createdAt: '2026-09-18T00:00:00+08:00', status: 'active' };

describe('自然日统计', () => {
  it('同一天三条记录只贡献一个活跃日', () => {
    const records = ['08:00', '12:00', '22:00'].map((time, index) => ({
      id: String(index), dimensionId: 'reading', stageId: 'stage-1', createdAt: `2026-09-21T${time}:00+08:00`
    }));
    const [stats] = calculateDimensionStats({ stages: [stage], dimensions: [dimension], records }, new Date('2026-09-21T23:00:00+08:00'));
    expect(stats.todayCount).toBe(3);
    expect(stats.recentCount).toBe(3);
    expect(stats.activeDays).toBe(1);
    expect(stats.stageRate).toBe(0.25);
  });

  it('最近七日不包含第八个自然日', () => {
    const records = [
      { id: 'old', dimensionId: 'reading', stageId: 'stage-1', createdAt: '2026-09-14T23:59:00+08:00' },
      { id: 'first', dimensionId: 'reading', stageId: 'stage-1', createdAt: '2026-09-15T00:00:00+08:00' },
      { id: 'today', dimensionId: 'reading', stageId: 'stage-1', createdAt: '2026-09-21T09:00:00+08:00' }
    ];
    const [stats] = calculateDimensionStats({ stages: [stage], dimensions: [dimension], records }, new Date('2026-09-21T18:00:00+08:00'));
    expect(stats.recentCount).toBe(2);
    expect(stats.activeDays).toBe(2);
  });
});
