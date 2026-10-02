// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STEPS,
  formatColor,
  parseColor,
  scale,
} from '@/shared/lib/colour';
import { exportPalette, tokenName, type ExportPalette } from './palette-export';

const three: ExportPalette = {
  name: 'Brand Blue',
  entries: [
    { label: '50', color: '#eff6ff' },
    { label: '500', color: 'rgb(59 130 246)' },
    { label: '950', color: '#172554' },
  ],
};

describe('exportPalette', () => {
  it('writes CSS variables', () => {
    expect(exportPalette(three, 'css').split('\n')).toEqual([
      ':root {',
      '  --brand-blue-50: #eff6ff;',
      '  --brand-blue-500: #3b82f6;',
      '  --brand-blue-950: #172554;',
      '}',
      '',
    ]);
  });

  it('writes a Tailwind v4 theme block', () => {
    const out = exportPalette(three, 'tailwind');
    expect(out.startsWith('@theme {\n')).toBe(true);
    expect(out).toContain('  --color-brand-blue-500: #3b82f6;');
  });

  it('writes design tokens JSON', () => {
    const json = JSON.parse(exportPalette(three, 'json')) as Record<
      string,
      Record<string, { $type: string; $value: string }>
    >;
    expect(json['brand-blue']['950']).toEqual({
      $type: 'color',
      $value: '#172554',
    });
  });

  it('writes an SVG sheet that parses, with one rect per step of a full scale', () => {
    const steps = scale(parseColor('#3b82f6'));
    const palette: ExportPalette = {
      name: 'Blue <scale>',
      entries: DEFAULT_STEPS.map((s) => ({
        label: String(s),
        color: formatColor(steps[s], 'hex'),
      })),
    };
    const doc = new DOMParser().parseFromString(
      exportPalette(palette, 'svg'),
      'image/svg+xml',
    );
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('rect')).toHaveLength(11);
    expect(doc.getElementsByTagName('title')[0].textContent).toBe(
      'Blue <scale>',
    );
  });
});

describe('tokenName', () => {
  it('slugs names and never returns an empty name', () => {
    expect(tokenName('  My Palette!! 2 ')).toBe('my-palette-2');
    expect(tokenName('***')).toBe('palette');
  });
});
