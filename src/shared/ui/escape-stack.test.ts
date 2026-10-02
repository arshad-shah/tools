/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { pushEscapeLayer } from './escape-stack';

const esc = () => {
  const e = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(e);
  return e;
};

describe('escape stack', () => {
  it('Esc goes to the topmost overlay only, then to the one below', () => {
    const dialog = vi.fn();
    const progress = vi.fn();
    const offDialog = pushEscapeLayer(dialog);
    const offProgress = pushEscapeLayer(progress);
    const e = esc();
    expect(progress).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
    offProgress();
    esc();
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledTimes(1);
    offDialog();
    expect(esc().defaultPrevented).toBe(false);
  });

  it('leaves an Esc another handler already took', () => {
    const layer = vi.fn();
    const off = pushEscapeLayer(layer);
    const taken = (e: Event) => e.preventDefault();
    document.body.addEventListener('keydown', taken);
    esc();
    expect(layer).not.toHaveBeenCalled();
    document.body.removeEventListener('keydown', taken);
    off();
  });
});
