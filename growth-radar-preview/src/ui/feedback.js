import { escapeHtml } from './safe-html.js';

const animate = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFeedback(framework) {
  let current;
  function dismiss() { current?.close(false); current = null; }
  function show(message, undo) {
    dismiss();
    const toast = framework.toast.create({
      text: escapeHtml(message), position: 'bottom', cssClass: 'health-toast',
      closeTimeout: undo ? 5000 : 3000, closeButton: Boolean(undo),
      closeButtonText: '撤销', destroyOnClose: true,
      on: {
        closeButtonClick: () => undo?.(),
        closed: () => { if (current === toast) current = null; }
      }
    });
    toast.el.setAttribute('role', 'status');
    toast.el.setAttribute('aria-live', 'polite');
    current = toast;
    toast.open(animate());
  }
  return { show, dismiss };
}

// Resolve only after the sheet closes, so focus and the underlying page are restored first.
export function confirmRestore(framework) {
  return new Promise((resolve) => {
    let approved = false;
    const trigger = document.activeElement;
    const background = [document.querySelector('#app'), document.querySelector('.tab-bar')];
    const actions = framework.actions.create({
      cssClass: 'health-actions', convertToPopover: false, closeOnEscape: true,
      animate: animate(),
      buttons: [[
        { text: '恢复备份将覆盖本机现有记录。请先导出当前数据。', label: true },
        { text: '覆盖并恢复', color: 'red', onClick: () => { approved = true; } }
      ], [{ text: '取消', strong: true }]],
      on: {
        open: () => background.forEach((element) => { element.inert = true; }),
        opened: (instance) => {
          instance.el.setAttribute('role', 'dialog');
          instance.el.setAttribute('aria-modal', 'true');
          instance.el.setAttribute('aria-label', '确认恢复备份');
          const buttons = [...instance.el.querySelectorAll('.actions-button')];
          buttons.forEach((button) => {
            button.setAttribute('role', 'button'); button.tabIndex = 0;
            button.onkeydown = (event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); }
              if (event.key === 'Tab') { event.preventDefault(); buttons[(buttons.indexOf(button) + 1) % buttons.length].focus(); }
            };
          });
          buttons.at(-1)?.focus();
        },
        closed: () => {
          background.forEach((element) => { element.inert = false; });
          trigger?.focus(); resolve(approved);
          window.setTimeout(() => actions.destroy(), 0);
        }
      }
    });
    actions.open(animate());
  });
}
