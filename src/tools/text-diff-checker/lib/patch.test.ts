import { applyPatch } from 'diff';
import { describe, expect, it } from 'vitest';
import { toUnifiedPatch } from './patch';

describe('toUnifiedPatch', () => {
  it('names both files and applies back to the right text', () => {
    const left = 'one\ntwo\nthree\nfour\n';
    const right = 'one\n2\nthree\nfour\nfive\n';
    const patch = toUnifiedPatch('a.txt', 'b.txt', left, right);
    expect(patch).toContain('--- a.txt');
    expect(patch).toContain('+++ b.txt');
    expect(applyPatch(left, patch)).toBe(right);
  });

  it('honours the context size', () => {
    const left = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n');
    const right = left.replace('l10', 'X');
    expect(toUnifiedPatch('a', 'b', left, right, 1)).toContain(
      '@@ -10,3 +10,3 @@',
    );
  });
});
