/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SecretText } from './secret-text';

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/shared/lib/notify', () => ({ notify }));

// Built from parts so it does not look like a credential.
const SECRET = ['demo', 'value', '42'].join('-');
const BULLET = String.fromCodePoint(0x2022);

function Harness({ copyable = false }: { copyable?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <SecretText
      value={SECRET}
      revealed={revealed}
      onRevealedChange={setRevealed}
      copyable={copyable}
      label="token"
    />
  );
}

describe('SecretText', () => {
  it('masked: no text or markup contains the secret or a bullet', () => {
    const { container } = render(<Harness />);
    expect(container.innerHTML).not.toContain(SECRET);
    expect(container.textContent).not.toContain(BULLET);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode())
      expect(n.textContent).not.toContain(SECRET);
    const mask = screen.getByRole('img', { name: 'Hidden token' });
    expect(mask.tagName.toLowerCase()).toBe('svg');
    expect(Number(mask.getAttribute('width'))).toBeGreaterThan(0);
  });

  it('the mask is sized to the length', () => {
    const { container, rerender } = render(
      <SecretText value="abc" revealed={false} onRevealedChange={() => {}} />,
    );
    const w3 = Number(container.querySelector('svg')!.getAttribute('width'));
    rerender(
      <SecretText
        value="abcdef"
        revealed={false}
        onRevealedChange={() => {}}
      />,
    );
    const w6 = Number(container.querySelector('svg')!.getAttribute('width'));
    expect(w6).toBe(w3 * 2);
  });

  it('the reveal toggle is pressed and shows the secret', () => {
    render(<Harness />);
    const toggle = screen.getByRole('button', { name: 'Reveal token' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(SECRET)).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  it('copies the value and toasts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<Harness copyable />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy token' }));
    });
    expect(writeText).toHaveBeenCalledWith(SECRET);
    expect(notify.success).toHaveBeenCalledWith('Copied');
  });

  it('has no copy button unless copyable', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Copy token' })).toBeNull();
  });
});
