import { afterEach, expect, it, vi } from 'vitest';
import { createFeedback, confirmRestore } from '../src/ui/feedback.js';

afterEach(() => vi.unstubAllGlobals());

function fixture(reduced = false) {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
  const instances = [];
  const framework = { toast: { create(params) {
    const instance = { params, el: { setAttribute: vi.fn() }, open: vi.fn(), close: vi.fn(() => params.on.closed()) };
    instances.push(instance); return instance;
  } } };
  return { feedback: createFeedback(framework), instances };
}

it('组件提示转义名称并保留撤销动作', () => {
  const { feedback, instances } = fixture();
  const undo = vi.fn();
  feedback.show('<img src=x>', undo);
  expect(instances[0].params.text).toBe('&lt;img src=x&gt;');
  expect(instances[0].params.closeButton).toBe(true);
  instances[0].params.on.closeButtonClick();
  expect(undo).toHaveBeenCalledOnce();
});

it('自动关闭后再次提示不会引用已销毁组件', () => {
  const { feedback, instances } = fixture(true);
  feedback.show('已保存');
  instances[0].params.on.closed();
  feedback.show('下一次');
  expect(instances[0].close).not.toHaveBeenCalled();
  expect(instances[1].open).toHaveBeenCalledWith(false);
  expect(instances[1].params.closeButton).toBe(false);
});

it('恢复操作默认取消，关闭面板后解除后台隔离', async () => {
  const background = { inert: false };
  const trigger = { focus: vi.fn() };
  vi.stubGlobal('document', { activeElement: trigger, querySelector: () => background });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), setTimeout: (callback) => callback() });
  let options;
  const instance = { open: vi.fn(), destroy: vi.fn() };
  const framework = { actions: { create: (params) => { options = params; return instance; } } };
  const result = confirmRestore(framework);
  options.on.open();
  expect(background.inert).toBe(true);
  options.on.closed();
  expect(await result).toBe(false);
  expect(background.inert).toBe(false);
  expect(trigger.focus).toHaveBeenCalledOnce();
});
