import { escapeHtml } from './safe-html.js';

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(value));
}

export function renderHistory(container, snapshot) {
  const stages = snapshot.stages.toSorted((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (stages.length === 0) {
    container.innerHTML = '<p class="empty-state">还没有阶段记录。</p>';
    return;
  }
  container.innerHTML = stages.map((stage) => {
    const active = stage.status === 'active';
    const range = `${formatDate(stage.createdAt)} ～ ${active ? '至今' : formatDate(stage.endedAt)}`;
    return `<button class="stage-row" type="button">
      <span class="stage-dot${active ? '' : ' muted-dot'}"></span>
      <span class="stage-copy"><strong>${escapeHtml(stage.name)}</strong><small>${escapeHtml(range)}</small></span>
      ${active ? '<span class="stage-status">进行中</span>' : ''}
      <img class="chevron" src="assets/icons/chevron-right.svg" alt="">
    </button>`;
  }).join('');
}
