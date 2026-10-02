/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { encodeShare } from '@/shared/lib/share-state';
import Calculator from './Tool';
import { calculatorSettings } from './settings';
import { CALCULATOR_SHARE_VERSION } from './share';

const TIMES = String.fromCodePoint(0xd7);

const resetSettings = () => {
  const { result, unmount } = renderHook(() =>
    calculatorSettings.useSettings(),
  );
  act(() => result.current[2]());
  unmount();
};

const renderTool = () =>
  render(
    <MemoryRouter>
      <Calculator />
    </MemoryRouter>,
  );

// Label queries, not role queries: role matching walks the whole tool
// tree and is slow in a loaded full run.
const press = (name: string) =>
  fireEvent.click(screen.getByLabelText(name, { selector: 'button' }));
const pressFace = (face: string) =>
  fireEvent.click(screen.getByText(face, { selector: 'button' }));
const line = (n: number) =>
  screen.getByLabelText(`Line ${n}`, { selector: 'textarea' });
const result = (n: number) => screen.getByTestId(`result-${n}`).textContent;

describe('Calculator', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettings();
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('clicking keypad 7, multiply, 6, = shows 42', () => {
    renderTool();
    pressFace('7');
    expect(screen.getByText(TIMES, { selector: 'button' })).toBeTruthy();
    press('Multiply');
    pressFace('6');
    expect(line(1)).toHaveProperty('value', '7*6');
    press('Equals');
    expect(result(1)).toBe('42');
    expect(calculatorSettings.getSettings().history.at(-1)).toMatchObject({
      expression: '7*6',
      result: '42',
    });
    expect(screen.getByText('= 42')).toBeTruthy();
    // = opened line 2 and made it active.
    pressFace('1');
    expect(line(2)).toHaveProperty('value', '1');
  });

  it('evaluates a sheet with variables, ans and per-line errors', () => {
    renderTool();
    fireEvent.change(line(1), { target: { value: 'a = 5' } });
    fireEvent.keyDown(line(1), { key: 'Enter' });
    fireEvent.change(line(2), { target: { value: 'a * 2' } });
    fireEvent.keyDown(line(2), { key: 'Enter' });
    fireEvent.change(line(3), { target: { value: '2 +' } });
    expect(result(1)).toBe('5');
    expect(result(2)).toBe('10');
    expect(result(3)).not.toBe('');
    expect(
      screen.getByTestId('result-3').querySelector('.text-danger'),
    ).not.toBeNull();
  });

  it('the page keys type into the active line when focus is outside it', () => {
    renderTool();
    for (const key of ['1', '2', '+', '3'])
      fireEvent.keyDown(document.body, { key });
    expect(line(1)).toHaveProperty('value', '12+3');
    expect(result(1)).toBe('15');
    fireEvent.keyDown(document.body, { key: 'Backspace' });
    expect(line(1)).toHaveProperty('value', '12+');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(line(1)).toHaveProperty('value', '');
  });

  it('applies angle and BigNumber settings to the sheet', () => {
    renderTool();
    fireEvent.change(line(1), { target: { value: '0.1 + 0.2' } });
    expect(result(1)).toBe('0.3');
    fireEvent.click(screen.getByLabelText('Exact decimals (BigNumber)'));
    expect(result(1)).toBe('0.3');
    fireEvent.change(line(1), { target: { value: 'sin(30)' } });
    expect(result(1)).toBe('0.5');
    fireEvent.click(screen.getByText('Radians', { selector: 'button' }));
    expect(result(1)).toMatch(/^-0\.988/);
  });

  it('opens the key help with ? and lists the keys', () => {
    renderTool();
    fireEvent.keyDown(document.body, { key: '?' });
    expect(
      screen.getByRole('dialog', { name: 'Calculator keys' }),
    ).toBeTruthy();
    expect(screen.getByText('Show this help')).toBeTruthy();
  });

  it('searches history and inserts a result', () => {
    const { result: s, unmount } = renderHook(() =>
      calculatorSettings.useSettings(),
    );
    act(() =>
      s.current[1]({
        history: [
          { expression: '2*21', result: '42', at: '' },
          { expression: '10/4', result: '2.5', at: '' },
        ],
      }),
    );
    unmount();
    renderTool();
    fireEvent.change(screen.getByLabelText('Search history'), {
      target: { value: '10' },
    });
    expect(screen.queryByText('2*21')).toBeNull();
    press('Use 2.5');
    expect(line(1)).toHaveProperty('value', '2.5');
    press('Add to favourites');
    expect(calculatorSettings.getSettings().saved).toHaveLength(1);
    const star = screen.getByRole('button', { name: 'Remove from favourites' });
    expect(star.getAttribute('aria-pressed')).toBe('true');
    expect(star.className).not.toMatch(/bg-accent\b/);
  });

  it('hydrates the sheet, angle and precision from a share link', () => {
    const enc = encodeShare(
      { lines: ['x = 3', 'x * 4'], angle: 'rad', precision: 8 },
      CALCULATOR_SHARE_VERSION,
    );
    if (!enc.ok) throw new Error('encode failed');
    window.history.replaceState(null, '', `/#${enc.fragment}`);
    renderTool();
    expect(line(1)).toHaveProperty('value', 'x = 3');
    expect(result(2)).toBe('12');
    expect(calculatorSettings.getSettings()).toMatchObject({
      angle: 'rad',
      precision: 8,
    });
  });

  it('programmer mode wraps 0xFF + 1 at 8 bits', () => {
    renderTool();
    fireEvent.click(screen.getByText('Programmer', { selector: 'button' }));
    fireEvent.click(screen.getByText('8-bit', { selector: 'button' }));
    fireEvent.click(screen.getByText('Unsigned', { selector: 'button' }));
    const expr = screen.getByLabelText('Expression');
    fireEvent.change(expr, { target: { value: '0xFF' } });
    fireEvent.keyDown(expr, { key: 'Enter' });
    expect(screen.getByLabelText('Decimal')).toHaveProperty('value', '255');
    fireEvent.change(expr, { target: { value: '0xFF + 1' } });
    fireEvent.keyDown(expr, { key: 'Enter' });
    expect(screen.getByLabelText('Decimal')).toHaveProperty('value', '0');
    expect(calculatorSettings.getSettings()).toMatchObject({
      wordBits: 8,
      signed: false,
    });
  });
});
