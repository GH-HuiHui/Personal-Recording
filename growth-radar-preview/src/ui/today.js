import { escapeHtml } from './safe-html.js';

export function createDimensionRows(dimensions, recordedId = null) {
  return dimensions.map((item) => `
    <article class="dimension-row">
      <img class="dimension-icon" src="assets/icons/${encodeURIComponent(item.icon)}.svg" alt="" aria-hidden="true">
      <div class="dimension-main">
        <p class="dimension-name">${escapeHtml(item.name)}</p>
        <p class="dimension-stats"><span>今日 ${item.todayCount} 次</span><span>近 7 日 ${item.recentCount} 次</span></p>
      </div>
      <button class="plus-button${recordedId === item.id ? ' is-recorded' : ''}" data-dimension-id="${escapeHtml(item.id)}" aria-label="记录一次${escapeHtml(item.name)}">
        <img src="assets/icons/plus.svg" alt="" aria-hidden="true">
      </button>
    </article>`).join('');
}

export function renderToday(container, dimensions, { recordedId = null, onRecord }) {
  container.innerHTML = createDimensionRows(dimensions, recordedId);
  container.querySelectorAll('.plus-button').forEach((button) => {
    button.addEventListener('click', () => onRecord(button.dataset.dimensionId));
  });
}
