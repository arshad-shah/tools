/** @vitest-environment jsdom */
import { Toaster } from '@arshad-shah/cynosure';
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

const enter = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'JWT token' }), {
    target: { value },
  });

const renderTool = () =>
  render(
    <MemoryRouter>
      <Toaster>
        <JWTDecoder />
      </Toaster>
    </MemoryRouter>,
  );

describe('JWTDecoder', () => {
  it('starts empty and decodes the example on request', () => {
    renderTool();
    expect(screen.getByRole('heading', { name: 'No token yet' })).toBeTruthy();
    // One example button, by the empty input.
    fireEvent.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(screen.getByRole('tablist', { name: 'JWT sections' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try an example' })).toBeNull();
    // The sample has exp and iat: one menu opens either in Epoch Converter.
    fireEvent.click(
      screen.getByRole('button', { name: 'Open in Epoch Converter' }),
    );
    for (const name of ['Expiry (exp)', 'Issued at (iat)'])
      expect(screen.getByRole('menuitem', { name })).toBeTruthy();
    expect(screen.getByText('user-12345')).toBeTruthy();
  });

  it('says what is wrong under the input', () => {
    renderTool();
    enter('not a token');
    expect(
      screen.getByRole('heading', { name: 'Nothing to decode' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('textbox', { name: 'JWT token' })
        .getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('enables Compare payloads once the second token decodes', () => {
    renderTool();
    enter(token({ sub: 'a', exp: 1700000000 }));
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
    // The skew is behind the Decoded token card's Clock skew button.
    expect(screen.queryByRole('combobox', { name: 'Clock skew' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clock skew' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Clock skew' }));
    fireEvent.click(screen.getByRole('option', { name: '30 s' }));
    expect(screen.getByText('Within validity window')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skew 30 s' })).toBeTruthy();
    // Saved for next time (a setting, never the token).
    expect(localStorage.getItem('kit:store:tool:jwt-decode')).toContain('30');
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

  it('masks a shared secret; public keys are a multi-line field', () => {
    renderTool();
    enter(token({ sub: 'x' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Signature' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Signature' }));
    const secret = screen.getByLabelText('Secret or public key');
    expect((secret as HTMLInputElement).type).toBe('password');
    fireEvent.click(screen.getByRole('radio', { name: 'PEM public key' }));
    expect(screen.getByLabelText('Secret or public key').tagName).toBe(
      'TEXTAREA',
    );
  });
});
