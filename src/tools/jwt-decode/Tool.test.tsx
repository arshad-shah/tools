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

const renderTool = () =>
  render(
    <MemoryRouter>
      <JWTDecoder />
    </MemoryRouter>,
  );

describe('JWTDecoder', () => {
  it('counts down live and honours the clock skew', () => {
    vi.useFakeTimers({ now: T0 });
    renderTool();
    const box = screen.getByRole('textbox', { name: 'JWT token' });
    fireEvent.change(box, {
      target: { value: token({ exp: T0 / 1000 + 252 }) },
    });
    expect(screen.getByText(/expires in 4 min 12 s/)).toBeTruthy();
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByText(/expires in 4 min 11 s/)).toBeTruthy();

    fireEvent.change(box, { target: { value: token({ exp: T0 / 1000 - 1 }) } });
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Clock skew'), {
      target: { value: '30' },
    });
    expect(screen.getByText('Within validity window')).toBeTruthy();
  });

  it('fills and decodes a token handed over as application/jwt', async () => {
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
  });
});
