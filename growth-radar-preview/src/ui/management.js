import { addDimension, archiveAndCreateStage, editDimension, renameStage } from '../data/stages.js';
import { escapeHtml as e } from './safe-html.js';

export function setupManagement({ getDb, getSnapshot, refresh, notify }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'management-dialog';
  document.querySelector('#growth-radar-app').append(dialog);
  const active = () => getSnapshot().stages.find((item) => item.status === 'active');
  const directions = () => getSnapshot().dimensions.filter((item) => item.stageId === active()?.id).toSorted((a,b) => a.sortOrder - b.sortOrder);

  function show(title, content, action) {
    dialog.innerHTML = `<form><h2>${e(title)}</h2>${content}<p class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" data-close>取消</button>${action ? '<button type="submit">保存</button>' : ''}</div></form>`;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      if (!action) return;
      const button = dialog.querySelector('[type=submit]');
      button.disabled = true;
      try { await action(new FormData(event.target)); await refresh(); dialog.close(); notify('已保存'); }
      catch (error) { dialog.querySelector('.dialog-error').textContent = error.message; }
      finally { button.disabled = false; }
    };
    if (!dialog.open) dialog.showModal();
  }
  const nameInput = (value) => `<label>名称<input name="name" required maxlength="24" value="${e(value)}"></label>`;
  function add() { show('添加方向', nameInput(''), (data) => addDimension(getDb(), data.get('name'))); }
  function manage() {
    show('方向管理', directions().map((item) => `<button class="manage-row" type="button" data-edit="${e(item.id)}">${e(item.name)}${item.isEnabled ? '' : '（已停用）'}</button>`).join(''), null);
    dialog.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => {
      const item = directions().find((entry) => entry.id === button.dataset.edit);
      show('编辑方向', `${nameInput(item.name)}<label class="check-row"><input type="checkbox" name="enabled" ${item.isEnabled ? 'checked' : ''}>在首页显示</label><p>停用方向会保留全部历史记录。</p>`, (data) => editDimension(getDb(), item.id, data.get('name'), data.has('enabled')));
    });
  }
  document.querySelector('#add-dimension-button').onclick = add;
  document.querySelector('#settings-current').onclick = (event) => {
    if (event.target.closest('[data-manage]')) manage();
    if (event.target.closest('[data-rename]')) show('阶段名称', nameInput(active().name), (data) => renameStage(getDb(), data.get('name')));
  };
  document.querySelector('#archive-stage').onclick = () => {
    show('归档并创建下一阶段', `${nameInput(`阶段 ${getSnapshot().stages.length + 1}`)}<p>选择继承的方向。当前阶段的记录将只读保留，新阶段从零开始。</p>${directions().map((item) => `<label class="check-row"><input type="checkbox" name="direction" value="${e(item.id)}" ${item.isEnabled ? 'checked' : ''}>${e(item.name)}</label>`).join('')}`, (data) => archiveAndCreateStage(getDb(), data.get('name'), data.getAll('direction')));
  };
  document.querySelector('#history-list').onclick = (event) => {
    const button = event.target.closest('[data-stage-id]');
    if (!button) return;
    const snapshot = getSnapshot();
    const stage = snapshot.stages.find((item) => item.id === button.dataset.stageId);
    const rows = snapshot.dimensions.filter((item) => item.stageId === stage.id).toSorted((a,b) => a.sortOrder - b.sortOrder).map((item) => {
      const count = snapshot.records.filter((record) => record.dimensionId === item.id).length;
      return `<p>${e(item.name)} · ${count} 次</p>`;
    }).join('');
    show(stage.name, rows, null);
  };
}
