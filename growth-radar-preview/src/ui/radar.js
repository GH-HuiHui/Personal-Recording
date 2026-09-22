import { escapeHtml } from './safe-html.js';
import { animateRadar } from './radar-motion.js';

const CENTER = Object.freeze({ x: 180, y: 148 });
const RADIUS = 102;

function point(angle, radius) {
  return [CENTER.x + Math.cos(angle) * radius, CENTER.y + Math.sin(angle) * radius];
}

function polygonPoints(values, max) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + index * (2 * Math.PI / values.length);
    return point(angle, RADIUS * (value / max)).join(',');
  }).join(' ');
}

export function createRadarMarkup(dimensions, mode) {
  if (dimensions.length < 3) return '';
  const isRecent = mode === 'recent';
  const max = isRecent ? 7 : 1;
  const values = dimensions.map((dimension) => isRecent ? dimension.activeDays : dimension.stageRate);
  const angles = values.map((_, index) => -Math.PI / 2 + index * (2 * Math.PI / values.length));
  const levels = isRecent ? [1, 5 / 7, 3 / 7, 1 / 7] : [1, 0.75, 0.5, 0.25];
  const grids = levels
    .map((level) => `<polygon class="grid" points="${polygonPoints(Array(values.length).fill(max * level), max)}"/>`)
    .join('');
  const axes = angles.map((angle) => {
    const [x, y] = point(angle, RADIUS);
    return `<line class="axis" x1="${CENTER.x}" y1="${CENTER.y}" x2="${x}" y2="${y}"/>`;
  }).join('');
  const labels = dimensions.map((dimension, index) => {
    const [x, y] = point(angles[index], 128);
    const shortName = dimension.name.replace(' / 雅思', '');
    const label = Array.from(shortName).length > 6 ? Array.from(shortName).slice(0, 5).join('') + '…' : shortName;
    return `<text class="radar-label" x="${x}" y="${y + 4}">${escapeHtml(label)}</text>`;
  }).join('');
  const points = values.map((value, index) => {
    const [x, y] = point(angles[index], RADIUS * value / max);
    return `<circle class="radar-point" cx="${x}" cy="${y}" r="4"/>`;
  }).join('');
  const range = isRecent ? '活跃天数 · 0–7 天' : '阶段活跃率 · 0–100%';
  const description = dimensions.map((dimension) => `${escapeHtml(dimension.name)}：${isRecent ? `${dimension.activeDays} 天` : `${Math.round(dimension.stageRate * 100)}%`}`).join('；');
  return `<title>${range}</title><desc>${description}</desc>${grids}${axes}<polygon class="radar-shape" points="${polygonPoints(values, max)}"/>${points}${labels}`;
}

export function renderRadar(svg, dimensions, mode) {
  const previous = svg.querySelector('.radar-shape')?.getAttribute('points');
  svg.innerHTML = createRadarMarkup(dimensions, mode);
  animateRadar(svg, previous);
  svg.setAttribute('aria-label', mode === 'recent' ? '最近七日成长方向活跃天数雷达图' : '本阶段成长方向活跃率雷达图');
}
