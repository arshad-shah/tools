import { describe, expect, it } from 'vitest';
import { containRect, contentBox, validateText } from './render';

describe('icon layout', () => {
  it('insets the content box by padding plus the maskable safe zone', () => {
    expect(contentBox(512)).toEqual({ x: 0, y: 0, size: 512 });
    expect(contentBox(512, 0.1)).toEqual({ x: 51, y: 51, size: 410 });
    expect(contentBox(512, 0, 0.1)).toEqual({ x: 51, y: 51, size: 410 });
    expect(contentBox(100, 0.4, 0.4).size).toBeGreaterThan(0);
  });

  it('fits a wide image inside the box, centred', () => {
    expect(containRect(200, 100, { x: 0, y: 0, size: 100 })).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
  });

  it('accepts 1 to 3 characters of text, counting astral characters once', () => {
    expect(() => validateText('T')).not.toThrow();
    expect(() => validateText('ABC')).not.toThrow();
    expect(() =>
      validateText(String.fromCodePoint(0x1d400).repeat(3)),
    ).not.toThrow();
    expect(() => validateText('')).toThrow(/1 to 3/);
    expect(() => validateText('ABCD')).toThrow(/1 to 3/);
  });
});
