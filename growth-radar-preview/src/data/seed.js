export const DEFAULT_DIMENSIONS = Object.freeze([
  { name: '阅读', icon: 'book-2' },
  { name: '英语 / 雅思', icon: 'language' },
  { name: '技术', icon: 'code' },
  { name: '锻炼健身', icon: 'barbell' },
  { name: '练字', icon: 'pencil' },
  { name: '自媒体', icon: 'microphone-2' }
]);

export function createInitialData(now = new Date()) {
  const createdAt = now.toISOString();
  const stageId = crypto.randomUUID();

  return {
    stage: {
      id: stageId,
      name: '阶段 1',
      createdAt,
      endedAt: null,
      status: 'active'
    },
    dimensions: DEFAULT_DIMENSIONS.map((dimension, sortOrder) => ({
      id: crypto.randomUUID(),
      stageId,
      name: dimension.name,
      icon: dimension.icon,
      sortOrder,
      isEnabled: true
    }))
  };
}
