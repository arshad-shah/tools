import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins conditionals and resolves Tailwind conflicts last-wins', () => {
    const hidden: boolean = false;
    expect(cn('px-2', hidden && 'hidden', 'px-4', { 'text-fg': true })).toBe(
      'px-4 text-fg',
    );
  });

  it('knows the touch-target sizes (tokens.css) conflict with h-, w- and size-', () => {
    expect(cn('h-9 px-4', 'p-0', 'size-touch')).toBe('p-0 size-touch');
    expect(cn('h-8 min-w-8', 'h-touch min-w-touch')).toBe(
      'h-touch min-w-touch',
    );
    expect(cn('w-9', 'w-touch')).toBe('w-touch');
    expect(cn('min-h-11', 'min-h-touch')).toBe('min-h-touch');
  });
});
