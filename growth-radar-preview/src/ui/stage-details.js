import { CHART_COLORS, DEFAULT_CHART } from '../domain/chart-preferences.js';
import { summarizeStage } from '../domain/stage-summary.js';
import { escapeHtml as e } from './safe-html.js';

const date = (value) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
const dailyRows = (rows) => rows.map((row) => `<tr><td>${e(row.date)}</td><td>${e(row.name)}</td><td>${row.count}</td></tr>`).join('');

export function createStageDetails(snapshot, stage, now = new Date()) {
  const summary = summarizeStage(snapshot, stage, now);
  const max = Math.max(1, ...summary.directions.map((item) => item.count));
  const bars = summary.directions.map((item) => `<li><div class="bar-caption"><span>${e(item.name)}${item.isEnabled ? '' : '（已停用）'}</span><strong>${item.count} 次</strong></div><div class="bar-track" aria-hidden="true"><span style="width:${item.count / max * 100}%"></span></div><p class="bar-note">${item.activeDays} 个活跃日 · 活跃率 ${item.rate}%</p></li>`).join('');
  return `<section class="stage-detail" style="--chart-color:${CHART_COLORS[(stage.chartPreferences || DEFAULT_CHART).color]}"><p class="stage-range">${date(stage.createdAt)} ～ ${stage.endedAt ? date(stage.endedAt) : '至今'} · ${stage.endedAt ? '已结束' : '进行中'}</p>
    <dl class="stage-totals"><div><dt>行动记录</dt><dd>${summary.total}<small>次</small></dd></div><div><dt>活跃日</dt><dd>${summary.activeDays}<small>天</small></dd></div><div><dt>阶段时长</dt><dd>${summary.duration}<small>天</small></dd></div></dl>
    <h3>方向投入</h3><p class="sheet-hint">条形长度表示记录次数；活跃率 = 活跃日 ÷ 阶段时长。</p>
    ${summary.total ? '' : '<p class="stage-empty">这个阶段还没有行动记录。以下方向均为 0 次。</p>'}<ul class="chart-bars stage-bars">${bars}</ul>
    <h3>每日明细</h3>${summary.daily.length ? `<table class="stage-table"><thead><tr><th scope="col">日期</th><th scope="col">方向</th><th scope="col">次数</th></tr></thead><tbody>${dailyRows(summary.daily.slice(0, 50))}</tbody></table>${summary.daily.length > 50 ? '<button type="button" data-more-records>查看更多明细</button>' : ''}` : '<p class="sheet-hint">暂无明细</p>'}</section>`;
}

export function setupStagePagination(container, snapshot, stage) {
  const button = container.querySelector('[data-more-records]');
  if (!button) return;
  const rows = summarizeStage(snapshot, stage).daily;
  let offset = 50;
  button.onclick = () => {
    container.querySelector('tbody').insertAdjacentHTML('beforeend', dailyRows(rows.slice(offset, offset + 50)));
    offset += 50;
    if (offset >= rows.length) { button.previousElementSibling?.querySelector('tbody tr:last-child td')?.setAttribute('tabindex', '-1'); button.previousElementSibling?.querySelector('tbody tr:last-child td')?.focus(); button.remove(); }
  };
}
