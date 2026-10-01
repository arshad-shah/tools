import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins conditionals and resolves Tailwind conflicts last-wins', () => {
    const hidden: boolean = false;
    expect(cn('px-2', hidden && 'hidden', 'px-4', { 'text-fg': true })).toBe(
      'px-4 text-fg',
    );
  });
});
