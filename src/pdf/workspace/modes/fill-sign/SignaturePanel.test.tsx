/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { SignaturePanel } from './SignaturePanel';
import { fillSign } from './store';

vi.mock('@/pdf/sign', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/pdf/sign')>()),
  ensureFontFace: () => new Promise<void>(() => {}),
  loadSignatureFont: () => new Promise(() => {}),
}));

const ctx = { doc: {}, selection: {} } as unknown as ModeProps;

afterEach(() => {
  fillSign.reset();
  fillSign.set({ drawing: { strokes: [], ink: null, weight: 'medium' } });
  vi.restoreAllMocks();
});

describe('SignaturePanel', () => {
  it('offers each signature method, the footer actions and the picture note', () => {
    render(<SignaturePanel ctx={ctx} />);
    const list = screen.getByRole('tablist', { name: 'Signature method' });
    expect(
      Array.from(list.querySelectorAll('[role="tab"]')).map(
        (t) => t.textContent,
      ),
    ).toEqual(['Draw', 'Type', 'Photo', 'Initials', 'Block', 'Upload']);
    expect(screen.getByRole('button', { name: 'Place' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Next place to sign' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'This is a picture of your signature. For a certificate-backed signature, turn on Digital signature when you export.',
      ),
    ).toBeTruthy();
  });

  it('opens on the Initials tab for initials, prefilled from the typed name', () => {
    fillSign.set({ panelRole: 'initials', typedName: 'Ada King Lovelace' });
    render(<SignaturePanel ctx={ctx} />);
    expect(
      screen
        .getByRole('tab', { name: 'Initials' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      (screen.getByRole('textbox', { name: 'Initials' }) as HTMLInputElement)
        .value,
    ).toBe('AKL');
  });

  it('keeps the drawing when you look at another tab, or close and reopen the panel', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const view = render(<SignaturePanel ctx={ctx} />);
    const place = () =>
      screen.getByRole('button', { name: 'Place' }) as HTMLButtonElement;
    const pad = screen.getByRole('img', { name: 'Draw your signature' });
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerMove(pad, { clientX: 60, clientY: 40 });
    fireEvent.pointerMove(pad, { clientX: 120, clientY: 30 });
    fireEvent.pointerUp(pad);
    expect(place().disabled).toBe(false);

    fireEvent.click(screen.getByRole('tab', { name: 'Type' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Draw' }));
    expect(place().disabled).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    view.unmount();
    render(<SignaturePanel ctx={ctx} />);
    expect(place().disabled).toBe(false);
  });

  it('the Block tab asks for a signature first', () => {
    render(<SignaturePanel ctx={ctx} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Block' }));
    expect(screen.getByText(/Make your signature in the Draw/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Place block' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Place' })).toBeNull();
  });
});
