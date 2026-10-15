import { escapeHtml as e } from './safe-html.js';

export function edgeScrollSpeed(y, top, bottom) {
  const edge = Math.min(48, (bottom - top) / 3);
  if (y < top + edge) return -14 * Math.min(1, Math.max(0, (top + edge - y) / edge));
  if (y > bottom - edge) return 14 * Math.min(1, Math.max(0, (y - bottom + edge) / edge));
  return 0;
}

export function createSortableDirections(items) {
  return `<p class="sheet-hint" id="direction-sort-hint">按住右侧手柄拖动排序，松手自动保存；也可直接选择目标位置。轻点名称可编辑。</p><p class="sort-status" role="status" aria-live="polite" data-sort-status></p><div class="direction-sort-list">${items.map((item, index) => `<div class="manage-row" data-direction-id="${e(item.id)}"><button class="manage-edit" type="button" data-edit="${e(item.id)}"><span>${e(item.name)}</span><small>${item.isEnabled ? '显示' : '已停用'}</small></button><select class="direction-position" data-position="${e(item.id)}" aria-label="${e(item.name)}的排序位置">${items.map((_, position) => `<option value="${position}" ${position === index ? 'selected' : ''}>第 ${position + 1} 位</option>`).join('')}</select><button class="direction-sort-handle" type="button" aria-label="拖动${e(item.name)}排序" aria-describedby="direction-sort-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg></button></div>`).join('')}</div>`;
}

// Pointer capture stays on the list while its rows move. Only a completed
// drop (or a direct position choice) writes to storage, once per operation.
export function setupDirectionSort(container, { save, status }) {
  const list = container.querySelector('.direction-sort-list');
  const scroller = container.closest('.management-dialog') || container;
  const overlay = container.closest('.health-sheet') || container;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = () => [...list.children];
  const order = () => rows().map((row) => row.dataset.directionId);
  let drag = null;
  let saving = false;
  let frame = 0;
  let destroyed = false;
  const listeners = new AbortController();
  function positions() { rows().forEach((row, index) => { row.querySelector('select').value = String(index); }); }
  function move(row, index) {
    const before = new Map(rows().map((item) => [item, item.offsetTop]));
    const others = rows().filter((item) => item !== row);
    list.insertBefore(row, others[index] || null);
    positions();
    drag?.handle.focus({ preventScroll: true });
    if (!reducedMotion) rows().forEach((item) => {
      const distance = before.get(item) - item.offsetTop;
      if (!distance || item === drag?.row) return;
      item.getAnimations().forEach((animation) => animation.cancel());
      if (item === row && !drag) item.classList.add('is-position-moving');
      const animation = item.animate([{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
      animation.finished.catch(() => {}).finally(() => item.classList.remove('is-position-moving'));
    });
  }
  function restore(ids) {
    const byId = new Map(rows().map((row) => [row.dataset.directionId, row]));
    ids.forEach((id) => list.append(byId.get(id)));
    positions();
  }
  async function persist(before, focus) {
    const ids = order();
    if (ids.every((id, index) => id === before[index])) return;
    saving = true;
    status('正在保存顺序…');
    try {
      await save(ids);
      if (!destroyed) status('顺序已保存，首页与图表已同步。');
    } catch (error) {
      if (!destroyed) { restore(before); status(error.message || '顺序未保存，请重试', true); }
    } finally { saving = false; if (!destroyed) focus?.focus({ preventScroll: true }); }
  }
  function place() {
    const top = list.getBoundingClientRect().top;
    const index = rows().filter((row) => row !== drag.row && drag.y > top + row.offsetTop + row.offsetHeight / 2).length;
    if (rows().indexOf(drag.row) !== index) move(drag.row, index);
    drag.ghost.querySelector('select').value = String(index);
    drag.ghost.style.transform = `translateY(${drag.y - drag.startY}px)`;
  }
  function scroll(time) {
    if (!drag?.active) return;
    const box = scroller.getBoundingClientRect();
    const toolbarHeight = container.querySelector('.sheet-toolbar')?.offsetHeight || 0;
    const step = Math.min(2, (time - (drag.time || time - 16)) / 16);
    drag.time = time;
    scroller.scrollTop += edgeScrollSpeed(drag.y, box.top + toolbarHeight, Math.min(box.bottom, window.innerHeight)) * step;
    place();
    frame = requestAnimationFrame(scroll);
  }
  function start(event) {
    const handle = event.target.closest('.direction-sort-handle');
    if (!handle || saving || drag || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    drag = { row: handle.closest('[data-direction-id]'), handle, pointerId: event.pointerId, startY: event.clientY, y: event.clientY, before: order(), active: false };
    list.setPointerCapture(event.pointerId);
  }
  function update(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    drag.y = event.clientY;
    if (!drag.active && Math.abs(drag.y - drag.startY) < 5) return;
    if (!drag.active) {
      drag.active = true;
      const box = drag.row.getBoundingClientRect();
      const parent = overlay.getBoundingClientRect();
      drag.ghost = drag.row.cloneNode(true);
      drag.ghost.classList.add('direction-drag-ghost');
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.querySelectorAll('button, select').forEach((element) => { element.disabled = true; element.tabIndex = -1; });
      Object.assign(drag.ghost.style, { left: `${box.left - parent.left}px`, top: `${box.top - parent.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      overlay.append(drag.ghost);
      drag.row.classList.add('is-sort-placeholder');
      list.classList.add('is-sorting');
      frame = requestAnimationFrame(scroll);
    }
    place();
  }
  function finish(cancel = false) {
    if (!drag) return;
    const current = drag;
    drag = null;
    cancelAnimationFrame(frame);
    current.ghost?.remove();
    current.row.classList.remove('is-sort-placeholder');
    list.classList.remove('is-sorting');
    if (list.hasPointerCapture(current.pointerId)) list.releasePointerCapture(current.pointerId);
    if (cancel) { restore(current.before); status('已取消排序'); }
    else if (current.active) void persist(current.before, current.handle);
    current.handle.focus({ preventScroll: true });
  }
  const listen = (name, handler, target = list) => target.addEventListener(name, handler, { signal: listeners.signal });
  listen('pointerdown', start);
  listen('pointermove', update);
  listen('pointerup', (event) => { if (event.pointerId === drag?.pointerId) finish(); });
  listen('pointercancel', () => finish(true));
  listen('lostpointercapture', () => finish(true));
  listen('change', (event) => {
    const select = event.target.closest('[data-position]');
    if (!select) return;
    if (saving || drag) { positions(); return; }
    const before = order();
    move(select.closest('[data-direction-id]'), Number(select.value));
    select.focus({ preventScroll: true });
    void persist(before, select);
  });
  listen('keydown', (event) => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); finish(true); }
  });
  return { destroy() { destroyed = true; finish(true); listeners.abort(); }, get busy() { return Boolean(drag) || saving; } };
}
