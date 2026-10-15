import { elapsedCalendarDays, startOfLocalDay } from './analytics.js';

function localDateKey(value) {
  const date = startOfLocalDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summarizeStage(snapshot, stage, now = new Date()) {
  const end = stage.endedAt || now.toISOString();
  const duration = elapsedCalendarDays(stage.createdAt, end);
  const directions = snapshot.dimensions.filter((item) => item.stageId === stage.id).toSorted((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(directions.map((item) => [item.id, { ...item, count: 0, days: new Set() }]));
  const days = new Set();
  const daily = new Map();
  let total = 0;
  for (const record of snapshot.records) {
    if (record.stageId !== stage.id || Date.parse(record.createdAt) < Date.parse(stage.createdAt) || Date.parse(record.createdAt) > Date.parse(end)) continue;
    const item = byId.get(record.dimensionId);
    if (!item) continue;
    const date = localDateKey(record.createdAt);
    item.count += 1;
    item.days.add(date);
    days.add(date);
    total += 1;
    const key = `${date}/${item.id}`;
    const row = daily.get(key) || { date, name: item.name, count: 0, sortOrder: item.sortOrder };
    row.count += 1;
    daily.set(key, row);
  }
  return {
    total, activeDays: days.size, duration,
    directions: [...byId.values()].map(({ days: active, ...item }) => ({ ...item, activeDays: active.size, rate: Math.round(active.size / duration * 100) })),
    daily: [...daily.values()].toSorted((a, b) => b.date.localeCompare(a.date) || a.sortOrder - b.sortOrder)
  };
}
