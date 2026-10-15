export const CHART_COLORS = Object.freeze({ blue: '#007aff', green: '#16834a', orange: '#bc5700', purple: '#8653cc' });
export const DEFAULT_CHART = Object.freeze({ type: 'radar', color: 'blue', showValues: true });

export function normalizeChartPreferences(value = DEFAULT_CHART) {
  if (!value || !['radar', 'bars'].includes(value.type) || !Object.hasOwn(CHART_COLORS, value.color) || typeof value.showValues !== 'boolean') {
    throw new Error('图表设置无效');
  }
  return { type: value.type, color: value.color, showValues: value.showValues };
}
