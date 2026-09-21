import { escapeHtml } from './safe-html.js';

export function renderSettings(container, snapshot) {
  const stage = snapshot.stages.find((item) => item.status === 'active');
  const count = snapshot.dimensions.filter((item) => item.stageId === stage?.id && item.isEnabled).length;
  container.innerHTML = `
    <button class="setting-row" type="button"><span>${escapeHtml(stage?.name || '未创建阶段')}</span><img class="chevron" src="assets/icons/chevron-right.svg" alt=""></button>
    <button class="setting-row" type="button"><span>方向管理</span><span class="setting-value">${count} 个方向</span><img class="chevron" src="assets/icons/chevron-right.svg" alt=""></button>`;
}
