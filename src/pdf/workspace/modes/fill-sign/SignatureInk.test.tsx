/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignatureSource } from '@/pdf/sign';
import { SignatureInk } from './SignatureInk';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal(
    'Path2D',
    class {
      constructor(public d: string) {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function draw(y: number) {
  const pad = screen.getByRole('img', { name: 'Draw your signature' });
  fireEvent.pointerDown(pad, { clientX: 10, clientY: y, button: 0 });
  fireEvent.pointerMove(pad, { clientX: 60, clientY: y + 10 });
  fireEvent.pointerMove(pad, { clientX: 120, clientY: y + 5 });
  fireEvent.pointerUp(pad);
}

type Ink = Extract<SignatureSource, { kind: 'ink' }>;
const last = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls[fn.mock.calls.length - 1][0] as Ink | null;

describe('SignatureInk', () => {
  it('redraws the strokes at the new weight when the weight changes', () => {
    const onChange = vi.fn();
    render(<SignatureInk onChange={onChange} />);
    draw(40);
    const medium = last(onChange)!;
    expect(medium.kind).toBe('ink');

    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }));
    expect(
      screen.getByRole('radio', { name: 'Bold' }).getAttribute('aria-checked'),
    ).toBe('true');
    const bold = last(onChange)!;
    // A bolder nib makes a wider outline around the same strokes.
    expect(bold.vector.height).toBeGreaterThan(medium.vector.height);
    expect(bold.vector.d).not.toBe(medium.vector.d);
  });

  it('"Undo stroke" removes the last stroke, and Mod+Z in the pad area does too', () => {
    const onChange = vi.fn();
    render(<SignatureInk onChange={onChange} />);
    draw(40);
    const one = last(onChange)!;
    draw(100);
    const two = last(onChange)!;
    expect(two.vector.d).not.toBe(one.vector.d);

    fireEvent.click(screen.getByRole('button', { name: 'Undo stroke' }));
    expect(last(onChange)!.vector.d).toBe(one.vector.d);

    const undoShortcut = { key: 'z', ctrlKey: true, metaKey: false };
    const weight = screen.getByRole('radio', { name: 'Medium' });
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    fireEvent.keyDown(weight, undoShortcut);
    document.removeEventListener('keydown', outside);
    expect(last(onChange)).toBeNull();
    expect(outside).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
