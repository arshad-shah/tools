import { describe, expect, it } from 'vitest';
import { unwrapDefault } from './interop';

describe('unwrapDefault', () => {
  const Component = () => null;

  it('returns the default export when the bundler hands back a CJS module object', () => {
    expect(unwrapDefault({ default: Component })).toBe(Component);
  });

  it('returns the value itself when the bundler already unwrapped it', () => {
    expect(unwrapDefault(Component)).toBe(Component);
  });

  it('keeps a value whose default export is missing', () => {
    const mod = { other: 1 };
    expect(unwrapDefault(mod)).toBe(mod);
  });
});
