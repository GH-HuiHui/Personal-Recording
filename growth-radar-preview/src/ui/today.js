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
        <span class="record-disk"><img class="record-plus" src="assets/icons/plus.svg" alt="" aria-hidden="true"><img class="record-success" src="assets/icons/check.svg" alt="" aria-hidden="true"></span>
      </button>
    </article>`).join('');
}

export function renderToday(container, dimensions, { recordedId = null, onRecord }) {
  const focusedId = container.contains(document.activeElement) ? document.activeElement.dataset.dimensionId : null;
  container.innerHTML = createDimensionRows(dimensions, recordedId);
  const recorded = container.querySelector('.is-recorded');
  if (recorded) window.setTimeout(() => recorded.classList.remove('is-recorded'), 900);
  container.querySelectorAll('.plus-button').forEach((button) => {
    button.addEventListener('click', () => onRecord(button.dataset.dimensionId));
    if (button.dataset.dimensionId === focusedId) button.focus({ preventScroll: true });
  });
}
