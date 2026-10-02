/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const faces = vi.hoisted(() => new Map<string, () => void>());

vi.mock('@/pdf/sign', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/pdf/sign')>();
  return {
    ...real,
    // Each font resolves when the test says so.
    ensureFontFace: (id: string) =>
      new Promise<void>((resolve) => faces.set(id, resolve)),
    loadSignatureFont: () =>
      Promise.resolve({ hasGlyphForCodePoint: () => true }),
  };
});

import { SignatureTypeGallery } from './SignatureTypeGallery';
import { nextSize } from './typed-size';

describe('SignatureTypeGallery', () => {
  it('shows the name in 10 style cards that load as their fonts arrive', async () => {
    const onChange = vi.fn();
    render(
      <SignatureTypeGallery
        name="Ada Lovelace"
        onNameChange={() => {}}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Style' });
    const cards = screen.getAllByRole('radio');
    expect(cards).toHaveLength(10);
    expect(group.contains(cards[0])).toBe(true);
    expect(screen.getAllByRole('status', { name: /^Loading / })).toHaveLength(
      10,
    );

    await act(async () => faces.get('caveat')!());
    expect(screen.getAllByRole('status', { name: /^Loading / })).toHaveLength(
      9,
    );
    expect(screen.getByRole('img', { name: 'Caveat sample' }).textContent).toBe(
      'Ada Lovelace',
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'text', fontId: 'dancing-script' }),
    );
  });

  it('arrow keys move the selection through the cards', async () => {
    const onChange = vi.fn();
    render(<SignatureTypeGallery name="Ada" onChange={onChange} />);
    const cards = screen.getAllByRole('radio');
    expect(cards[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(cards[0], { key: 'ArrowRight' });
    await act(async () => {});
    expect(cards[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(cards[1]);
    fireEvent.keyDown(cards[1], { key: 'ArrowDown' });
    await act(async () => {});
    expect(cards[3].getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ fontId: 'sacramento' }),
    );
  });

  it('the slant slider reads its value in degrees', async () => {
    const onChange = vi.fn();
    render(<SignatureTypeGallery name="Ada" onChange={onChange} />);
    const slant = screen.getByRole('slider', { name: 'Slant' });
    fireEvent.change(slant, { target: { value: '5' } });
    await act(async () => {});
    expect(slant.getAttribute('aria-valuetext')).toBe('5 degrees');
    expect(screen.getByText('5 degrees')).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ slant: 5, size: 'fit' }),
    );
  });

  it('size is Auto at 0 and skips 1 to 7', () => {
    expect(nextSize(0, 1)).toBe(8);
    expect(nextSize(8, 7)).toBe(0);
    expect(nextSize(8, 9)).toBe(9);
  });
});
