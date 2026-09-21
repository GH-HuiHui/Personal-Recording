const DAY_MS = 86_400_000;

export function startOfLocalDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(value) {
  const date = startOfLocalDay(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function elapsedCalendarDays(from, to) {
  const fromDay = startOfLocalDay(from);
  const toDay = startOfLocalDay(to);
  const utcFrom = Date.UTC(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate());
  const utcTo = Date.UTC(toDay.getFullYear(), toDay.getMonth(), toDay.getDate());
  return Math.max(1, Math.floor((utcTo - utcFrom) / DAY_MS) + 1);
}

export function calculateDimensionStats(snapshot, now = new Date()) {
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const recentStart = new Date(todayStart);
  recentStart.setDate(recentStart.getDate() - 6);
  const stageById = new Map(snapshot.stages.map((stage) => [stage.id, stage]));

  return snapshot.dimensions
    .filter((dimension) => dimension.isEnabled)
    .toSorted((a, b) => a.sortOrder - b.sortOrder)
    .map((dimension) => {
      const stage = stageById.get(dimension.stageId);
      const records = snapshot.records.filter((record) => record.dimensionId === dimension.id);
      const todayRecords = records.filter((record) => {
        const createdAt = new Date(record.createdAt);
        return createdAt >= todayStart && createdAt < tomorrowStart;
      });
      const recentRecords = records.filter((record) => {
        const createdAt = new Date(record.createdAt);
        return createdAt >= recentStart && createdAt < tomorrowStart;
      });
      const activeDays = new Set(recentRecords.map((record) => dayKey(record.createdAt))).size;
      const stageDays = new Set(records.map((record) => dayKey(record.createdAt))).size;
      const elapsedDays = stage ? elapsedCalendarDays(stage.createdAt, now) : 1;

      return {
        ...dimension,
        todayCount: todayRecords.length,
        recentCount: recentRecords.length,
        activeDays,
        stageCount: records.length,
        stageActiveDays: stageDays,
        stageRate: Math.min(1, stageDays / elapsedDays)
      };
    });
}
