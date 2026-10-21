/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldEditor } from './FieldEditor';
import type { ViewField } from './fields';

const field = {
  key: 'free:1',
  rect: { x: 0, y: 0, width: 160, height: 14 },
  type: 'text',
  label: 'Text',
  value: 'Hi',
  origin: 'free',
} as unknown as ViewField;

function setup(patch: Partial<Parameters<typeof FieldEditor>[0]> = {}) {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <FieldEditor
      field={field}
      onCommit={onCommit}
      onCancel={onCancel}
      onTab={() => {}}
      {...patch}
    />,
  );
  return { onCommit, onCancel, view };
}

describe('FieldEditor', () => {
  it('types straight onto the page: a transparent caret at the text size', () => {
    setup({ inline: { fontPx: 18, spacingPx: 0 } });
    const input = screen.getByRole('textbox', { name: 'Text' });
    expect(input.className).toContain('text-transparent');
    expect(input.style.fontSize).toBe('18px');
    expect(document.activeElement).toBe(input);
  });

  it('Esc keeps the text when asked', () => {
    const { onCommit, onCancel } = setup({ escapeKeeps: true });
    const input = screen.getByRole('textbox', { name: 'Text' });
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCommit).toHaveBeenCalledWith('Hello');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps typed text when it closes without Enter (another field clicked, mode left)', () => {
    const onLeave = vi.fn();
    const { view } = setup({ onLeave });
    fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), {
      target: { value: 'Smith' },
    });
    view.unmount();
    expect(onLeave).toHaveBeenCalledOnce();
    expect(onLeave).toHaveBeenCalledWith('Smith');
  });

  it('closing untouched, or after Enter or Esc, does not write twice', () => {
    const onLeave = vi.fn();
    setup({ onLeave }).view.unmount();
    const typed = setup({ onLeave });
    const input = screen.getByRole('textbox', { name: 'Text' });
    fireEvent.change(input, { target: { value: 'Smith' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    typed.view.unmount();
    const cancelled = setup({ onLeave });
    const again = screen.getByRole('textbox', { name: 'Text' });
    fireEvent.change(again, { target: { value: 'Nope' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    cancelled.view.unmount();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('finishes when the bar says Done, not when it opens', () => {
    const onFinish = vi.fn();
    const { view } = setup({ finishNonce: 3, onFinish });
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), {
      target: { value: 'Done text' },
    });
    view.rerender(
      <FieldEditor
        field={field}
        onCommit={() => {}}
        onCancel={() => {}}
        onTab={() => {}}
        finishNonce={4}
        onFinish={onFinish}
      />,
    );
    expect(onFinish).toHaveBeenCalledWith('Done text');
  });
});
