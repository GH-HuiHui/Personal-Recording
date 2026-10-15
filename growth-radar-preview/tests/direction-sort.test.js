import { expect, it } from 'vitest';
import { createSortableDirections, edgeScrollSpeed } from '../src/ui/direction-sort.js';

it('方向可直接选择任意目标位置，并提供单次拖动手柄', () => {
  const markup = createSortableDirections([{ id: '<a>', name: '<阅读>', isEnabled: true }, { id: 'b', name: '技术', isEnabled: false }]);
  expect(markup).toContain('按住右侧手柄拖动排序');
  expect(markup).toContain('aria-label="&lt;阅读&gt;的排序位置"');
  expect(markup).toContain('aria-label="拖动技术排序"');
  expect(markup).toContain('<option value="1" selected>第 2 位</option>');
  expect(markup).toContain('已停用');
  expect(markup).not.toContain('data-move');
  expect(markup).not.toContain('<阅读>');
});

it('边缘滚动方向正确、速度有界，在列表中部保持静止', () => {
  expect(edgeScrollSpeed(300, 100, 500)).toBe(0);
  expect(edgeScrollSpeed(110, 100, 500)).toBeLessThan(0);
  expect(edgeScrollSpeed(490, 100, 500)).toBeGreaterThan(0);
  expect(edgeScrollSpeed(-100, 100, 500)).toBe(-14);
  expect(edgeScrollSpeed(1000, 100, 500)).toBe(14);
  expect(edgeScrollSpeed(150, 100, 200)).toBe(0);
});
