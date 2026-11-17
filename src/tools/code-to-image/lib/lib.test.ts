import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { CODE_IMAGE_DEFAULTS, readScale } from '../settings';
import { assertNoDataFields } from '../../../../test/helpers/settings-guard';
import {
  backdropFor,
  DEFAULT_SOLID,
  GRADIENTS,
  isHexColor,
} from './backgrounds';
import { canCopyImages, copyPng } from './clipboard-image';
import { parseLineRanges } from './highlight';
import { CODE_MIMES } from './mimes';
import {
  expandTabs,
  IMAGE_LANGUAGES,
  imageInput,
  languageForHandoff,
} from './spec';
import { DEFAULT_THEME, themeById, THEMES } from './themes';

describe('parseLineRanges', () => {
  it('reads numbers and ranges in any separator', () => {
    expect([...parseLineRanges('1, 4-6  9;3')].sort((a, b) => a - b)).toEqual([
      1, 3, 4, 5, 6, 9,
    ]);
    expect([...parseLineRanges('7-5')]).toEqual([5, 6, 7]);
    expect(parseLineRanges('  ').size).toBe(0);
  });

  it('names what it cannot read', () => {
    expect(() => parseLineRanges('2, x')).toThrow('"x" is not a line number');
    expect(() => parseLineRanges('0')).toThrow('Line numbers start at 1');
    expect(() => parseLineRanges('1-99999')).toThrow('too long');
    expect(() => parseLineRanges('1--2')).toThrow(ToolError);
  });
});

describe('themes', () => {
  it('have unique ids, both light and dark ones, and full palettes', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES.some((t) => t.dark)).toBe(true);
    expect(THEMES.some((t) => !t.dark)).toBe(true);
    const colour = /^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/i;
    for (const t of THEMES) {
      const p = t.palette;
      for (const c of [
        p.background,
        p.foreground,
        p.border,
        p.gutter,
        p.gutterActive,
        p.highlight,
        p.chrome,
        p.title,
        p.shadow,
        ...p.dots,
        ...Object.values(p.tokens),
      ])
        expect(c, t.id).toMatch(colour);
      expect(Object.keys(p.tokens)).toContain('keyword');
    }
  });

  it('an unknown id falls back to the default', () => {
    expect(themeById('nope').id).toBe(DEFAULT_THEME);
    expect(themeById('paper').label).toBe('Paper');
  });
});

describe('backgrounds', () => {
  it('builds each kind of backdrop', () => {
    expect(backdropFor('transparent', 'x', 'y')).toEqual({
      kind: 'transparent',
    });
    expect(backdropFor('solid', '', '#123456')).toEqual({
      kind: 'solid',
      color: '#123456',
    });
    expect(backdropFor('solid', '', 'red;}')).toEqual({
      kind: 'solid',
      color: DEFAULT_SOLID,
    });
    expect(backdropFor('gradient', 'dusk', '')).toMatchObject({
      kind: 'gradient',
      stops: GRADIENTS.find((g) => g.id === 'dusk')?.stops,
    });
    expect(backdropFor('gradient', 'unknown', '')).toMatchObject({
      kind: 'gradient',
      angle: 135,
    });
  });

  it('accepts hex colours only', () => {
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('#a1b2c3d4')).toBe(true);
    expect(isHexColor('url(x)')).toBe(false);
  });
});

describe('spec', () => {
  it('expands tabs to the next stop', () => {
    expect(expandTabs('\tx', 4)).toBe('    x');
    expect(expandTabs('ab\tc', 4)).toBe('ab  c');
    expect(expandTabs('none', 2)).toBe('none');
  });

  it('finds a language from the file name, then the mime', () => {
    expect(languageForHandoff('text/plain', 'a.sql')).toBe('sql');
    expect(languageForHandoff('text/typescript')).toBe('ts');
    expect(languageForHandoff('text/plain', 'notes.unknown')).toBeNull();
    expect(CODE_MIMES).toContain('application/json');
    expect(IMAGE_LANGUAGES.map((l) => l.id)).not.toContain('csv');
  });

  it('builds the drawing input from the settings, clamped', () => {
    const input = imageInput(
      'a\r\n\tb\n\n',
      'js',
      {
        ...CODE_IMAGE_DEFAULTS,
        fontSize: 99,
        padding: -5,
        widthMode: 'fixed',
        width: 50,
      },
      { title: '  main.js ', highlight: new Set([2]) },
    );
    expect(input.lines).toEqual(['a', '  b']);
    expect(input.tokens).toHaveLength(2);
    expect(input.options).toMatchObject({
      fontSize: 28,
      padding: 0,
      width: 320,
      title: 'main.js',
      overflow: 'wrap',
    });
    expect(input.style.palette).toBe(themeById(DEFAULT_THEME).palette);
    const noFrame = imageInput(
      'x',
      'plain',
      { ...CODE_IMAGE_DEFAULTS, chrome: false },
      {
        title: 'hidden',
        highlight: new Set(),
      },
    );
    expect(noFrame.options.title).toBe('');
    expect(noFrame.options.width).toBe('auto');
  });
});

describe('settings', () => {
  it('hold styling only', () => {
    expect(() => assertNoDataFields(CODE_IMAGE_DEFAULTS)).not.toThrow();
    expect(Object.keys(CODE_IMAGE_DEFAULTS)).not.toContain('title');
    expect(readScale({ ...CODE_IMAGE_DEFAULTS, scale: 3 })).toBe(3);
    expect(readScale({ ...CODE_IMAGE_DEFAULTS, scale: 9 })).toBe(2);
  });
});

describe('copyPng', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says clearly when the browser cannot copy images', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    expect(canCopyImages()).toBe(false);
    await expect(copyPng(Promise.resolve(new Blob()))).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
      message: expect.stringContaining('Download the PNG instead'),
    });
  });

  it('writes a PNG item to the clipboard', async () => {
    const write = vi.fn(async () => {});
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(readonly items: Record<string, unknown>) {}
      },
    );
    vi.stubGlobal('navigator', { clipboard: { write } });
    expect(canCopyImages()).toBe(true);
    await copyPng(Promise.resolve(new Blob()));
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('keeps a render error, and reports a refused write', async () => {
    vi.stubGlobal('ClipboardItem', class {});
    vi.stubGlobal('navigator', {
      clipboard: {
        write: vi.fn(async () => Promise.reject(new Error('denied'))),
      },
    });
    const failed = new ToolError('TOO_LARGE', 'Too large to draw');
    await expect(copyPng(Promise.reject(failed))).rejects.toBe(failed);
    await expect(copyPng(Promise.resolve(new Blob()))).rejects.toMatchObject({
      code: 'UNKNOWN',
    });
  });
});
