import { expect, it } from 'vitest';
import { formFingerprint, formState } from '../src/ui/form-state.js';
import { todaySummary } from '../src/ui/today.js';

it('未修改的编辑表单不能重复保存，改名后可保存', () => {
  const entries = [['name', '阅读'], ['enabled', 'on']];
  const baseline = formFingerprint(entries);
  expect(formState(entries, baseline, { requireChanges: true })).toEqual({ dirty: false, canSave: false });
  expect(formState([['name', '读书'], ['enabled', 'on']], baseline, { requireChanges: true })).toEqual({ dirty: true, canSave: true });
});

it('启用状态修改属于未保存修改，空白名称不可保存', () => {
  const baseline = formFingerprint([['name', '阅读'], ['enabled', 'on']]);
  expect(formState([['name', '阅读']], baseline).dirty).toBe(true);
  expect(formState([['name', '   ']], baseline).canSave).toBe(false);
  expect(formState([['name', '读书']], baseline, { valid: false }).canSave).toBe(false);
});

it('今日摘要按次数求和，方向数去重且不把次数当活跃天数', () => {
  expect(todaySummary([{ todayCount: 3 }, { todayCount: 1 }, { todayCount: 0 }])).toBe('今日已记录 4 次 · 2 个方向');
  expect(todaySummary([])).toContain('还没有记录');
});
