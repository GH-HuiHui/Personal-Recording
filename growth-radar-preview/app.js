const dimensions = [
  { name: '阅读', icon: 'book-2', today: 1, recent: 8, activeDays: 5, stageRate: 0.64 },
  { name: '英语 / 雅思', icon: 'language', today: 0, recent: 4, activeDays: 3, stageRate: 0.42 },
  { name: '技术', icon: 'code', today: 2, recent: 7, activeDays: 4, stageRate: 0.58 },
  { name: '锻炼健身', icon: 'barbell', today: 1, recent: 3, activeDays: 3, stageRate: 0.36 },
  { name: '练字', icon: 'pencil', today: 0, recent: 2, activeDays: 2, stageRate: 0.28 },
  { name: '自媒体', icon: 'microphone-2', today: 0, recent: 1, activeDays: 1, stageRate: 0.18 }
];

let mode = 'recent';
let lastAction = null;
let undoTimer = null;
let recordedIndex = null;
const radar = document.querySelector('#radar-svg');
const dimensionList = document.querySelector('#dimension-list');
const toast = document.querySelector('#undo-toast');
const toastMessage = document.querySelector('#toast-message');

function point(angle, radius) {
  return [180 + Math.cos(angle) * radius, 148 + Math.sin(angle) * radius];
}

function polygonPoints(values, max, radius = 102) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + index * (2 * Math.PI / values.length);
    return point(angle, radius * (value / max)).join(',');
  }).join(' ');
}

function renderRadar(values, max) {
  const count = values.length;
  const angles = values.map((_, index) => -Math.PI / 2 + index * (2 * Math.PI / count));
  const grids = [1, .75, .5, .25].map(level => `<polygon class="grid" points="${polygonPoints(Array(count).fill(max * level), max)}"/>`).join('');
  const axes = angles.map(angle => {
    const [x, y] = point(angle, 102);
    return `<line class="axis" x1="180" y1="148" x2="${x}" y2="${y}"/>`;
  }).join('');
  const labels = dimensions.map((dimension, index) => {
    const [x, y] = point(angles[index], 128);
    return `<text class="radar-label" x="${x}" y="${y + 4}">${dimension.name.replace(' / 雅思', '')}</text>`;
  }).join('');
  const points = values.map((value, index) => {
    const [x, y] = point(angles[index], 102 * value / max);
    return `<circle class="radar-point" cx="${x}" cy="${y}" r="4"/>`;
  }).join('');
  const scaleText = mode === 'recent' ? ['7', '5', '3', '1'] : ['100', '75', '50', '25'];
  const scales = scaleText.map((label, index) => `<text class="scale-label" x="185" y="${49 + index * 25.5}">${label}</text>`).join('');
  radar.innerHTML = `${grids}${axes}${scales}<polygon class="radar-shape" points="${polygonPoints(values, max)}"/>${points}${labels}`;
}

function renderToday() {
  const isRecent = mode === 'recent';
  document.querySelector('#radar-title').textContent = isRecent ? '近 7 日持续性' : '本阶段活跃率';
  document.querySelector('#radar-description').textContent = isRecent ? '按活跃天数统计' : '活跃天数占比';
  renderRadar(dimensions.map(item => isRecent ? item.activeDays : item.stageRate), isRecent ? 7 : 1);
  dimensionList.innerHTML = dimensions.map((item, index) => `
    <article class="dimension-row">
      <img class="dimension-icon" src="assets/icons/${item.icon}.svg" alt="" aria-hidden="true">
      <div class="dimension-main">
        <p class="dimension-name">${item.name}</p>
        <p class="dimension-stats"><span>今日 ${item.today} 次</span><span>近 7 日 ${item.recent} 次</span></p>
      </div>
      <button class="plus-button${recordedIndex === index ? ' is-recorded' : ''}" data-index="${index}" aria-label="记录一次${item.name}">
        <img src="assets/icons/plus.svg" alt="" aria-hidden="true">
      </button>
    </article>`).join('');
  dimensionList.querySelectorAll('.plus-button').forEach(button => button.addEventListener('click', () => recordAction(Number(button.dataset.index))));
  recordedIndex = null;
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('.metric-button').forEach(button => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderToday();
}

function setTab(tab) {
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('is-active', panel.id === `${tab}-panel`));
  document.querySelectorAll('.tab-button').forEach(button => {
    const selected = button.dataset.tab === tab;
    button.classList.toggle('is-selected', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelector('#app').scrollTo({ top: 0, behavior: 'smooth' });
}

function recordAction(index) {
  const dimension = dimensions[index];
  lastAction = { index, before: { today: dimension.today, recent: dimension.recent, activeDays: dimension.activeDays } };
  const wasInactiveToday = dimension.today === 0;
  dimension.today += 1;
  dimension.recent += 1;
  if (wasInactiveToday) dimension.activeDays = Math.min(7, dimension.activeDays + 1);
  recordedIndex = index;
  if ('vibrate' in navigator) navigator.vibrate(12);
  renderToday();
  showToast(`已记录 · ${dimension.name}`, true);
}

function showToast(message, canUndo) {
  window.clearTimeout(undoTimer);
  toastMessage.textContent = message;
  toast.classList.toggle('is-info', !canUndo);
  toast.classList.add('is-visible');
  undoTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function undoLastAction() {
  if (!lastAction) return;
  Object.assign(dimensions[lastAction.index], lastAction.before);
  lastAction = null;
  window.clearTimeout(undoTimer);
  toast.classList.remove('is-visible');
  renderToday();
}

function announceAddDimension() {
  lastAction = null;
  showToast('请在设置中管理方向', false);
}

document.querySelectorAll('.metric-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
document.querySelector('#undo-button').addEventListener('click', undoLastAction);
document.querySelector('#add-dimension-button').addEventListener('click', announceAddDimension);
renderToday();
