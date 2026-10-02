/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextStyleBar } from './TextStyleBar';

const anchor = { getBoundingClientRect: () => new DOMRect(100, 100, 160, 20) };
const STYLE = { size: 11, color: '#000000', spacing: 0, comb: 0 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(patch: Partial<Parameters<typeof TextStyleBar>[0]> = {}) {
  const onPreview = vi.fn();
  const onChange = vi.fn();
  render(
    <TextStyleBar
      anchor={anchor}
      settings={STYLE}
      multiline={false}
      large={false}
      focusNonce={0}
      onPreview={onPreview}
      onChange={onChange}
      onClose={() => {}}
      {...patch}
    />,
  );
  return { onPreview, onChange };
}

describe('TextStyleBar', () => {
  it('labels every control', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Text settings' })).toBeTruthy();
    for (const name of [
      'Text size in points',
      'Letter spacing in points',
      'Number of character boxes',
    ])
      expect(screen.getByRole('spinbutton', { name })).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'Text size presets' }),
    ).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Letter spacing' })).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Character boxes' }),
    ).toBeTruthy();
  });

  it('previews at once and settles into one change', () => {
    const { onPreview, onChange } = setup();
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Text size in points' }),
      {
        target: { value: '14' },
      },
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Character boxes' }));
    expect(onPreview).toHaveBeenLastCalledWith({ ...STYLE, size: 14, comb: 8 });
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...STYLE, size: 14, comb: 8 });
  });

  it('leaves spacing and character boxes out for multiline text', () => {
    setup({ multiline: true });
    expect(
      screen.queryByRole('switch', { name: 'Character boxes' }),
    ).toBeNull();
    expect(
      screen.getByText(
        'Letter spacing and character boxes apply to single-line text.',
      ),
    ).toBeTruthy();
  });

  it('takes focus when asked (Alt+T)', () => {
    setup({ focusNonce: 1 });
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
  });
});
