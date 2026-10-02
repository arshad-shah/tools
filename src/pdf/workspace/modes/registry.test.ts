import { describe, expect, it } from 'vitest';
import { getMode, MODE_ORDER, MODES, shortcutFor } from './registry';

describe('mode registry', () => {
  it('shortcuts follow the fixed spec order', () => {
    expect(shortcutFor('organize')).toBe('1');
    expect(shortcutFor('ocr')).toBe('9');
    expect(MODE_ORDER).toHaveLength(9);
  });

  it('modes are unique and in spec order', () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const positions = ids.map((id) => MODE_ORDER.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const m of MODES) {
      expect(m.shortcut).toBe(shortcutFor(m.id));
      expect(getMode(m.id)).toBe(m);
    }
    expect(getMode('nope')).toBeUndefined();
  });
});
