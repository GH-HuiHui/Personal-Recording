function localDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getMonthKey(value) {
  return localDateKey(value).slice(0, 7);
}

function adjacentMonth(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 1 + offset, 1));
}

export function monthRange(snapshot, monthKey, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new RangeError('月份格式无效');
  const currentMonth = getMonthKey(now);
  if (monthKey > currentMonth) throw new RangeError('不能查看未来月份');

  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = monthKey === currentMonth ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(year, month, 0);
  const days = [];
  for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
    days.push({ date: localDateKey(date), count: 0 });
  }

  const counts = new Map();
  for (const record of snapshot.records) {
    const day = localDateKey(record.createdAt);
    if (day < days[0]?.date || day > days.at(-1)?.date) continue;
    const key = `${day}\0${record.stageId}\0${record.dimensionId}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const stages = snapshot.stages.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const rows = [];
  stages.forEach((stage, stageIndex) => {
    const dimensions = snapshot.dimensions
      .filter((dimension) => dimension.stageId === stage.id)
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    const start = localDateKey(stage.createdAt);
    const end = stage.endedAt ? localDateKey(stage.endedAt) : days.at(-1)?.date;
    dimensions.forEach((dimension, dimensionIndex) => {
      for (const day of days) {
        if (day.date < start || day.date > end) continue;
        const count = counts.get(`${day.date}\0${stage.id}\0${dimension.id}`) || 0;
        rows.push({
          date: day.date,
          stageOrder: stageIndex + 1,
          stageName: stage.name,
          dimensionOrder: dimensionIndex + 1,
          dimensionName: dimension.name,
          count
        });
        day.count += count;
      }
    });
  });

  const earliestMonth = stages.length ? getMonthKey(stages[0].createdAt) : currentMonth;
  const previous = adjacentMonth(monthKey, -1);
  return {
    days,
    rows,
    totalCount: days.reduce((sum, day) => sum + day.count, 0),
    activeDays: days.filter((day) => day.count > 0).length,
    previousMonth: previous >= earliestMonth ? previous : null,
    nextMonth: monthKey < currentMonth ? adjacentMonth(monthKey, 1) : null
  };
}
