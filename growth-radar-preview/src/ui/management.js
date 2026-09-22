import { addDimension, archiveAndCreateStage, editDimension, renameStage } from '../data/stages.js';
import { escapeHtml as e } from './safe-html.js';
import { formFingerprint, formState } from './form-state.js';

export function setupManagement({ framework, getDb, getSnapshot, refresh, notify, dismissFeedback }) {
  const modal = document.createElement('div');
  modal.className = 'sheet-modal health-sheet';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'sheet-heading');
  modal.innerHTML = '<div class="sheet-modal-inner management-dialog"></div>';
  const dialog = modal.firstElementChild;
  document.querySelector('#growth-radar-app').append(modal);
  let trigger;
  let triggerSelector;
  let baseline;
  let saving = false;
  let leave = () => close();
  const state = () => formState(new FormData(dialog.querySelector('form')), baseline);
  const background = [document.querySelector('#app'), document.querySelector('.tab-bar')];
  const sheet = framework.sheet.create({ el: modal, backdrop: true, closeOnEscape: false, closeByBackdropClick: false,
    on: {
      open: () => background.forEach((element) => { element.inert = true; }),
      opened: () => dialog.querySelector('input, button')?.focus(),
      closed: () => {
        background.forEach((element) => { element.inert = false; });
        const target = trigger?.isConnected ? trigger : triggerSelector ? document.querySelector(triggerSelector) : null;
        target?.focus();
      }
    }
  });
  const close = () => sheet.close(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function requestLeave(destination = close) {
    if (saving) return;
    if (!state().dirty) { destination(); return; }
    const guard = dialog.querySelector('.discard-guard');
    guard.hidden = false;
    const resume = guard.querySelector('[data-resume]');
    resume.onclick = () => { guard.hidden = true; dialog.querySelector('input, [data-close]').focus(); };
    guard.querySelector('[data-discard]').onclick = () => { if (!saving) destination(); };
    resume.focus();
    guard.scrollIntoView({ block: 'nearest' });
  }
  sheet.backdropEl.addEventListener('click', () => { if (sheet.opened) requestLeave(); });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); requestLeave(leave); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('input:not(:disabled), button:not(:disabled)')].filter((element) => !element.closest('[hidden]'));
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  const active = () => getSnapshot().stages.find((item) => item.status === 'active');
  const directions = () => getSnapshot().dimensions.filter((item) => item.stageId === active()?.id).toSorted((a,b) => a.sortOrder - b.sortOrder);

  function show(title, content, action, { back, requireChanges = false, saveLabel = '保存' } = {}) {
    dismissFeedback?.();
    if (!sheet.opened) {
      trigger = document.activeElement;
      triggerSelector = trigger?.hasAttribute('data-rename') ? '[data-rename]' : trigger?.hasAttribute('data-manage') ? '[data-manage]' : null;
    }
    leave = back || close;
    dialog.innerHTML = `<form><div class="sheet-toolbar"><button type="button" data-close>${back ? '返回' : action ? '取消' : '完成'}</button><h2 id="sheet-heading">${e(title)}</h2>${action ? `<button type="submit">${e(saveLabel)}</button>` : '<span></span>'}</div><div class="sheet-fields">${content}<p class="dialog-error" role="alert"></p><div class="discard-guard" hidden role="alert"><p>有尚未保存的修改</p><div><button type="button" data-resume>继续编辑</button><button type="button" data-discard>放弃修改</button></div></div></div></form>`;
    const form = dialog.querySelector('form');
    baseline = formFingerprint(new FormData(form));
    const button = dialog.querySelector('[type=submit]');
    function updateSave() {
      if (button) button.disabled = saving || !formState(new FormData(form), baseline, { valid: form.checkValidity(), requireChanges }).canSave;
    }
    form.addEventListener('input', updateSave);
    form.addEventListener('change', updateSave);
    updateSave();
    dialog.querySelector('[data-close]').onclick = () => requestLeave(leave);
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!action || saving || button.disabled) return;
      saving = true;
      button.disabled = true;
      button.textContent = '保存中';
      dialog.querySelector('[data-close]').disabled = true;
      try {
        await action(new FormData(event.target)); await refresh();
        saving = false;
        if (back) back(); else close();
        notify('已保存');
      }
      catch (error) { dialog.querySelector('.dialog-error').textContent = error.message; }
      finally {
        saving = false;
        if (button.isConnected) { button.textContent = saveLabel; dialog.querySelector('[data-close]').disabled = false; updateSave(); }
      }
    };
    if (!sheet.opened) sheet.open(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    else dialog.querySelector('input, button')?.focus();
  }
  const nameInput = (value) => `<label>名称<input name="name" required maxlength="24" value="${e(value)}"></label>`;
  function add() { show('添加方向', nameInput(''), (data) => addDimension(getDb(), data.get('name'))); }
  function manage() {
    show('方向管理', '<p class="sheet-hint">轻点方向可编辑；停用后仍保留历史记录。</p>' + directions().map((item) => `<button class="manage-row" type="button" data-edit="${e(item.id)}"><span>${e(item.name)}</span><span class="manage-status">${item.isEnabled ? '显示' : '已停用'}<img class="chevron" src="assets/icons/chevron-right.svg" alt=""></span></button>`).join(''), null);
    dialog.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => {
      const item = directions().find((entry) => entry.id === button.dataset.edit);
      show('编辑方向', `${nameInput(item.name)}<label class="check-row"><input type="checkbox" name="enabled" ${item.isEnabled ? 'checked' : ''}>在首页显示</label><p>停用方向会保留全部历史记录。</p>`, (data) => editDimension(getDb(), item.id, data.get('name'), data.has('enabled')), { back: manage, requireChanges: true });
    });
  }
  document.querySelector('#add-dimension-button').onclick = add;
  document.querySelector('#settings-current').onclick = (event) => {
    if (event.target.closest('[data-manage]')) manage();
    if (event.target.closest('[data-rename]')) show('阶段名称', nameInput(active().name), (data) => renameStage(getDb(), data.get('name')), { requireChanges: true });
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
