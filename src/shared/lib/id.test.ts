import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses crypto.randomUUID when available', () => {
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('falls back outside a secure context (no randomUUID)', () => {
    vi.stubGlobal('crypto', {});
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+-\d+-[a-z0-9]+$/);
  });
});
