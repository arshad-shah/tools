/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextStyleBar } from './TextStyleBar';

const anchor = { getBoundingClientRect: () => new DOMRect(100, 300, 160, 20) };
const STYLE = { size: 11, color: '#000000', spacing: 0, comb: 0 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(patch: Partial<Parameters<typeof TextStyleBar>[0]> = {}) {
  const onPreview = vi.fn();
  const onChange = vi.fn();
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(
    <TextStyleBar
      anchor={anchor}
      settings={STYLE}
      multiline={false}
      layout="standard"
      focusNonce={0}
      onPreview={onPreview}
      onChange={onChange}
      onClose={onClose}
      onDone={onDone}
      {...patch}
    />,
  );
  const bar = screen.getByRole('toolbar', { name: 'Text settings' });
  return { onPreview, onChange, onClose, onDone, bar };
}

describe('TextStyleBar', () => {
  it('is one slim toolbar of labelled controls', () => {
    const { bar } = setup();
    const ui = within(bar);
    for (const name of ['Text size in points', 'Letter spacing in points'])
      expect(ui.getByRole('spinbutton', { name })).toBeTruthy();
    for (const name of [
      'Smaller text',
      'Larger text',
      'Text colour',
      'Tighter letter spacing',
      'Wider letter spacing',
      'Character boxes',
      'More text settings',
      'Done',
    ])
      expect(ui.getByRole('button', { name })).toBeTruthy();
    // No slider or long labels in the bar itself.
    expect(ui.queryByRole('slider')).toBeNull();
    expect(ui.queryByRole('combobox')).toBeNull();
  });

  it('steps the size with A- and A+ and previews at once, settling once', () => {
    const { bar, onPreview, onChange } = setup();
    const ui = within(bar);
    fireEvent.click(ui.getByRole('button', { name: 'Larger text' }));
    fireEvent.click(ui.getByRole('button', { name: 'Larger text' }));
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, size: 12 });
    expect(
      (
        ui.getByRole('spinbutton', {
          name: 'Text size in points',
        }) as HTMLInputElement
      ).value,
    ).toBe('12');
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...STYLE, size: 12 });
  });

  it('toggles character boxes with a cell count stepper', () => {
    const { bar, onPreview } = setup();
    const ui = within(bar);
    const comb = ui.getByRole('button', { name: 'Character boxes' });
    expect(comb.getAttribute('aria-pressed')).toBe('false');
    expect(
      ui.queryByRole('spinbutton', { name: 'Number of character boxes' }),
    ).toBeNull();
    fireEvent.click(comb);
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, comb: 8 });
    expect(comb.getAttribute('aria-pressed')).toBe('true');
    const cells = ui.getByRole('spinbutton', {
      name: 'Number of character boxes',
    });
    expect((cells as HTMLInputElement).value).toBe('8');
    fireEvent.click(ui.getByRole('button', { name: 'More boxes' }));
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, comb: 9 });
  });

  it('steps letter spacing', () => {
    const { bar, onPreview } = setup();
    fireEvent.click(
      within(bar).getByRole('button', { name: 'Wider letter spacing' }),
    );
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, spacing: 0.5 });
  });

  it('leaves spacing and character boxes out for multiline text', () => {
    const { bar } = setup({ multiline: true });
    expect(
      within(bar).queryByRole('button', { name: 'Character boxes' }),
    ).toBeNull();
    expect(
      within(bar).queryByRole('spinbutton', {
        name: 'Letter spacing in points',
      }),
    ).toBeNull();
  });

  it('opens quick colours from the swatch', () => {
    const { bar, onPreview } = setup();
    fireEvent.click(within(bar).getByRole('button', { name: 'Text colour' }));
    const dialog = screen.getByRole('dialog', { name: 'Text colour' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Blue' }));
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, color: '#1d4ed8' });
  });

  it('More opens every setting: presets, exact values, slider, colour picker', () => {
    const { bar, onPreview } = setup();
    fireEvent.click(
      within(bar).getByRole('button', { name: 'More text settings' }),
    );
    const sheet = screen.getByRole('dialog', { name: 'More text settings' });
    const ui = within(sheet);
    expect(
      ui.getByRole('combobox', { name: 'Text size presets' }),
    ).toBeTruthy();
    expect(ui.getByRole('slider', { name: 'Letter spacing' })).toBeTruthy();
    expect(ui.getByRole('switch', { name: 'Character boxes' })).toBeTruthy();
    fireEvent.click(ui.getByRole('switch', { name: 'Character boxes' }));
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, comb: 8 });
  });

  it('More is a bottom sheet on a phone, and Done stays pinned', () => {
    const { bar } = setup({ layout: 'phone' });
    expect(within(bar).getByRole('button', { name: 'Done' })).toBeTruthy();
    fireEvent.click(
      within(bar).getByRole('button', { name: 'More text settings' }),
    );
    expect(screen.getByRole('dialog', { name: 'Text settings' })).toBeTruthy();
  });

  it('Esc closes the bar; Done finishes', () => {
    const { bar, onClose, onDone } = setup();
    const ui = within(bar);
    fireEvent.keyDown(ui.getByRole('button', { name: 'Larger text' }), {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(ui.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a change still settling lands when the bar closes', () => {
    const onChange = vi.fn();
    const view = render(
      <TextStyleBar
        anchor={anchor}
        settings={STYLE}
        multiline={false}
        layout="standard"
        focusNonce={0}
        onPreview={() => {}}
        onChange={onChange}
        onClose={() => {}}
        onDone={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Larger text' }));
    expect(onChange).not.toHaveBeenCalled();
    view.unmount();
    expect(onChange).toHaveBeenCalledWith({ ...STYLE, size: 11.5 });
  });

  it('takes focus when asked (Alt+T)', () => {
    setup({ focusNonce: 1 });
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Text size in points',
    );
  });
});
