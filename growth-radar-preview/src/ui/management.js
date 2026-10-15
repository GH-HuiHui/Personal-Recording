import { addDimension, archiveAndCreateStage, editDimension, renameStage, reorderDimensions, saveChartPreferences } from '../data/stages.js';
import { DEFAULT_CHART } from '../domain/chart-preferences.js';
import { createStageDetails, setupStagePagination } from './stage-details.js';
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
    const controls = [...dialog.querySelectorAll('input:not(:disabled), select:not(:disabled), button:not(:disabled)')].filter((element) => !element.closest('[hidden]'));
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
      triggerSelector = trigger?.hasAttribute('data-rename') ? '[data-rename]' : trigger?.hasAttribute('data-manage') ? '[data-manage]' : trigger?.hasAttribute('data-chart-settings') ? '[data-chart-settings]' : null;
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
  const icons = { 'book-2': '阅读', language: '语言', code: '技术', barbell: '健身', pencil: '书写', 'microphone-2': '创作' };
  const iconInput = (value) => `<label>方向图标<select name="icon">${Object.entries(icons).map(([id, label]) => `<option value="${id}" ${id === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
  function chartSettings() {
    const preferences = active().chartPreferences || DEFAULT_CHART;
    const select = (name, choices) => `<select name="${name}">${Object.entries(choices).map(([value, label]) => `<option value="${value}" ${value === preferences[name] ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
    show('图表设置', `<label>图表样式${select('type', { radar: '雷达图', bars: '条形图' })}</label><label>图表颜色${select('color', { blue: '蓝色', green: '绿色', orange: '橙色', purple: '紫色' })}</label><label class="check-row"><input type="checkbox" name="showValues" ${preferences.showValues ? 'checked' : ''}>显示具体数值</label><p class="sheet-hint">方向顺序与首页一致。设置保存在本阶段，并包含在加密备份中。</p>`, (data) => saveChartPreferences(getDb(), { type: data.get('type'), color: data.get('color'), showValues: data.has('showValues') }), { requireChanges: true });
  }
  function add() { show('添加方向', nameInput('') + iconInput('book-2'), (data) => addDimension(getDb(), data.get('name'), data.get('icon'))); }
  function manage() {
    const items = directions();
    show('方向管理', '<p class="sheet-hint" role="status">用上下按钮调整顺序，自动保存并同步首页与图表。轻点名称可修改图标或停用。</p>' + items.map((item, index) => `<div class="manage-row"><button class="manage-edit" type="button" data-edit="${e(item.id)}"><span>${e(item.name)}</span><small>${item.isEnabled ? '显示' : '已停用'}</small></button><div class="manage-order"><button type="button" data-move="${e(item.id)}" data-step="-1" aria-label="上移${e(item.name)}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="${e(item.id)}" data-step="1" aria-label="下移${e(item.name)}" ${index === items.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join(''), null);
    dialog.querySelectorAll('[data-move]').forEach((button) => button.onclick = async () => {
      if (saving || button.disabled) return;
      saving = true;
      const ids = directions().map((item) => item.id);
      const from = ids.indexOf(button.dataset.move);
      const to = from + Number(button.dataset.step);
      [ids[from], ids[to]] = [ids[to], ids[from]];
      dialog.querySelectorAll('button').forEach((control) => { control.disabled = true; });
      try {
        await reorderDimensions(getDb(), ids);
        await refresh();
        saving = false;
        manage();
        const moved = [...dialog.querySelectorAll('[data-move]')].filter((control) => control.dataset.move === button.dataset.move);
        (moved.find((control) => !control.disabled) || dialog.querySelector('[data-close]')).focus();
        dialog.querySelector('[role=status]').textContent = '顺序已保存，首页与图表已同步。';
      } catch (error) {
        saving = false;
        manage();
        dialog.querySelector('.dialog-error').textContent = error.message;
      }
    });
    dialog.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => {
      const item = directions().find((entry) => entry.id === button.dataset.edit);
      show('编辑方向', `${nameInput(item.name)}${iconInput(item.icon)}<label class="check-row"><input type="checkbox" name="enabled" ${item.isEnabled ? 'checked' : ''}>在首页显示</label><p>停用方向会保留全部历史记录。</p>`, (data) => editDimension(getDb(), item.id, data.get('name'), data.has('enabled'), data.get('icon')), { back: manage, requireChanges: true });
    });
  }
  document.querySelector('#add-dimension-button').onclick = add;
  document.querySelector('#settings-current').onclick = (event) => {
    if (event.target.closest('[data-manage]')) manage();
    if (event.target.closest('[data-chart-settings]')) chartSettings();
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
    show(stage.name, createStageDetails(snapshot, stage), null);
    setupStagePagination(dialog, snapshot, stage);
  };
}
