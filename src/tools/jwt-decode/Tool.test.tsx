/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HANDOFF_PARAM, putHandoff } from '@/shared/lib/handoff';
import JWTDecoder from './Tool';

const part = (o: object) =>
  btoa(JSON.stringify(o))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const token = (payload: object) =>
  `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.c2ln`;

const T0 = Date.parse('2026-01-01T00:00:00Z');

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));
/** Puts a token in the Input pane, then shows the Output pane (R41). */
const enter = (value: string) => {
  tab('Input');
  fireEvent.change(screen.getByRole('textbox', { name: 'JWT token' }), {
    target: { value },
  });
  tab('Output');
};

const renderTool = () =>
  render(
    <MemoryRouter>
      <JWTDecoder />
    </MemoryRouter>,
  );

describe('JWTDecoder', () => {
  it('token and decoded view are tabs; the decoded view is shown first', () => {
    renderTool();
    tab('Input');
    expect(screen.getByRole('textbox', { name: 'JWT token' })).toBeTruthy();
    expect(screen.queryByRole('tablist', { name: 'JWT sections' })).toBeNull();
    enter(token({ sub: 'x', exp: 1700000000 }));
    expect(screen.getByRole('tablist', { name: 'JWT sections' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'JWT token' })).toBeNull();
  });

  it('compares payloads in Text Diff and opens exp in the Epoch Converter', () => {
    renderTool();
    enter(token({ sub: 'a', exp: 1700000000 }));
    // Both targets accept these hand-offs now, so the actions are enabled.
    expect(
      screen.getByRole('button', { name: 'Open exp in Epoch Converter' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Compare with another token' }),
    );
    const compare = screen.getByRole('button', {
      name: 'Compare payloads in Text Diff',
    }) as HTMLButtonElement;
    expect(compare.disabled).toBe(true);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Token to compare' }),
      {
        target: { value: token({ sub: 'b' }) },
      },
    );
    expect(compare.disabled).toBe(false);
    expect(screen.queryByText(/cannot take a pair/)).toBeNull();
  });

  it('counts down live and honours the clock skew', () => {
    vi.useFakeTimers({ now: T0 });
    renderTool();
    enter(token({ exp: T0 / 1000 + 252 }));
    expect(screen.getByText(/expires in 4 min 12 s/)).toBeTruthy();
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByText(/expires in 4 min 11 s/)).toBeTruthy();

    enter(token({ exp: T0 / 1000 - 1 }));
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Clock skew'), {
      target: { value: '30' },
    });
    expect(screen.getByText('Within validity window')).toBeTruthy();
  });

  it('fills and decodes a token handed over as application/jwt', async () => {
    // The Input pane was the last one shown.
    const first = renderTool();
    tab('Input');
    first.unmount();
    const id = putHandoff({
      kind: 'text',
      mime: 'application/jwt',
      text: token({ sub: 'from-handoff' }),
      sourceTool: 'base64-converter',
    });
    window.history.replaceState(null, '', `/?${HANDOFF_PARAM}=${id}`);
    renderTool();
    expect((await screen.findAllByText(/from-handoff/)).length).toBeGreaterThan(
      0,
    );
    // The hand-off fills the input and shows the decoded token.
    expect(
      screen
        .getByRole('tab', { name: /^Output/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });
});
