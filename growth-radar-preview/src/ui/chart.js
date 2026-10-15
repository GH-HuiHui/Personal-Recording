import { DEFAULT_CHART, CHART_COLORS } from '../domain/chart-preferences.js';
import { renderRadar } from './radar.js';
import { escapeHtml as e } from './safe-html.js';

export function createBarMarkup(stats, mode, { showValues = true } = DEFAULT_CHART) {
  const recent = mode === 'recent';
  return `<ul class="chart-bars" aria-label="${recent ? '近七日活跃天数' : '阶段活跃率'}">${stats.map((item) => {
    const ratio = recent ? item.activeDays / 7 : item.stageRate;
    const value = recent ? `${item.activeDays} 天` : `${Math.round(item.stageRate * 100)}%`;
    return `<li><div class="bar-caption"><span>${e(item.name)}</span>${showValues ? `<strong>${value}</strong>` : ''}</div><div class="bar-track" role="img" aria-label="${e(item.name)}：${value}"><span style="width:${Math.min(100, Math.max(0, ratio * 100))}%"></span></div></li>`;
  }).join('')}</ul>`;
}

export function renderGrowthChart(svg, bars, stats, mode, preferences = DEFAULT_CHART) {
  const color = CHART_COLORS[preferences.color];
  svg.closest('.radar-section').style.setProperty('--chart-color', color);
  svg.toggleAttribute('hidden', preferences.type === 'bars');
  bars.hidden = preferences.type !== 'bars';
  if (preferences.type === 'bars') bars.innerHTML = createBarMarkup(stats, mode, preferences);
  else renderRadar(svg, stats, mode, preferences);
}
