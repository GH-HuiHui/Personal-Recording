import { getMonthKey, monthRange } from '../domain/trends.js';
import { downloadTrendCsv, downloadTrendPng } from '../data/trend-export.js';
import { escapeHtml } from './safe-html.js';

function chartMarkup(days, monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const maximum = Math.max(1, ...days.map((day) => day.count));
  const step = 304 / Math.max(1, days.length);
  const width = Math.min(8, step * 0.7);
  const bars = days.map((day, index) => {
    if (!day.count) return '';
    const height = Math.max(3, day.count / maximum * 110);
    const x = 36 + index * step + (step - width) / 2;
    const y = 174 - height;
    const date = Number(day.date.slice(-2));
    return `<rect class="trend-bar" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="3" fill="#007aff"><title>${month}月${date}日 ${day.count}次</title></rect>`;
  }).join('');
  const ticks = days.map((day, index) => {
    const date = Number(day.date.slice(-2));
    if (date !== 1 && date % 7 !== 0 && index !== days.length - 1) return '';
    return `<text x="${(36 + index * step + step / 2).toFixed(2)}" y="195" fill="#64646b" font-size="11" text-anchor="middle">${date}</text>`;
  }).join('');
  const description = days.map((day) => `${Number(day.date.slice(-2))}日${day.count}次`).join('，');
  return `<svg class="trend-chart" viewBox="0 0 360 220" role="img" aria-label="${year}年${month}月每日行动次数趋势图" xmlns="http://www.w3.org/2000/svg">
    <title>${year}年${month}月每日行动次数</title><desc>${escapeHtml(description)}</desc>
    <rect width="360" height="220" fill="#ffffff"/>
    <text x="14" y="24" fill="#1c1c1e" font-size="14" font-weight="700">${year} 年 ${month} 月行动趋势</text>
    <line x1="36" y1="174" x2="340" y2="174" stroke="#d1d1d6" stroke-width="1"/>
    <line x1="36" y1="119" x2="340" y2="119" stroke="#e5e5ea" stroke-width="1"/>
    <line x1="36" y1="64" x2="340" y2="64" stroke="#e5e5ea" stroke-width="1"/>
    <text x="27" y="178" fill="#64646b" font-size="11" text-anchor="end">0</text>
    <text x="27" y="68" fill="#64646b" font-size="11" text-anchor="end">${maximum}</text>
    ${bars}${ticks}
  </svg>`;
}

export function createTrendMarkup(result, monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return `<div class="trend-header"><h2>月度趋势</h2><p>按本地自然日统计行动次数</p></div>
    <div class="trend-month-controls">
      <button type="button" data-trend-action="previous" aria-label="上个月" ${result.previousMonth ? '' : 'disabled'}>‹</button>
      <strong>${year} 年 ${month} 月</strong>
      <button type="button" data-trend-action="next" aria-label="下个月" ${result.nextMonth ? '' : 'disabled'}>›</button>
    </div>
    <p class="trend-total">${result.totalCount} 次记录 · ${result.activeDays} 个活跃日</p>
    <div class="trend-chart-wrap">${chartMarkup(result.days, monthKey)}</div>
    ${result.totalCount ? '' : '<p class="trend-empty">这个月还没有行动记录。</p>'}
    <div class="trend-export-actions">
      <button type="button" data-trend-action="png">导出趋势图</button>
      <button type="button" data-trend-action="csv">导出 CSV</button>
    </div>`;
}

export function setupTrendControls({ container, getSnapshot, notify }) {
  let monthKey = getMonthKey(new Date());
  let result;
  const render = () => {
    result = monthRange(getSnapshot(), monthKey);
    container.innerHTML = createTrendMarkup(result, monthKey);
  };

  container.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-trend-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.trendAction;
    if (action === 'previous' || action === 'next') {
      monthKey = action === 'previous' ? result.previousMonth : result.nextMonth;
      render();
      container.querySelector(`[data-trend-action="${action}"]`)?.focus();
      return;
    }
    button.disabled = true;
    try {
      result = monthRange(getSnapshot(), monthKey);
      if (action === 'csv') downloadTrendCsv(result.rows, monthKey);
      else if (action === 'png') await downloadTrendPng(container.querySelector('.trend-chart'), monthKey);
      notify('文件已准备下载，请在设备中确认保存');
    } catch (error) {
      notify(error.message || '导出失败，请重试');
    } finally {
      button.disabled = false;
    }
  });
  return { render };
}
