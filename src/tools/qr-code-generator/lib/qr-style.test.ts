import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../../test/helpers/settings-guard';
import { QR_DEFAULTS } from '../settings';
import { canShareType, parseQrShare } from '../share';
import { batchFromCsv, readCsv, safeStem } from './batch';
import { DEFAULT_FIELDS } from './payloads';
import { printPixels, qrSvg, type QrStyle } from './render';
import { assessScannability } from './scannability';

const style: QrStyle = {
  fg: '#000000',
  bg: '#ffffff',
  ecc: 'M',
  margin: 4,
  logo: '',
  logoFraction: 0,
  excavate: true,
};

describe('assessScannability', () => {
  it('passes a classic black on white code', () => {
    expect(assessScannability({ ...style, logoFraction: 0 }).warnings).toEqual(
      [],
    );
  });
  it('warns about low contrast', () => {
    const { warnings } = assessScannability({
      ...style,
      fg: '#777',
      bg: '#888',
    });
    expect(warnings.some((w) => /contrast/i.test(w))).toBe(true);
  });
  it('warns about inverted colours', () => {
    const { warnings } = assessScannability({
      ...style,
      fg: '#ffffff',
      bg: '#000000',
    });
    expect(warnings.some((w) => /inverted/i.test(w))).toBe(true);
  });
  it('warns when the logo is beyond the error correction capacity', () => {
    expect(
      assessScannability({ ...style, ecc: 'M', logoFraction: 0.3 }).warnings,
    ).toHaveLength(1);
    expect(
      assessScannability({ ...style, ecc: 'H', logoFraction: 0.2 }).warnings,
    ).toEqual([]);
  });
  it('warns about a missing quiet zone', () => {
    expect(assessScannability({ ...style, margin: 0 }).warnings[0]).toMatch(
      /quiet zone/i,
    );
  });
});

describe('render', () => {
  it('draws standalone SVG', async () => {
    const svg = await qrSvg('https://a.test', style, 256);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('height="256"');
  });
  it('converts a print size to pixels at 300 dpi', () => {
    expect(printPixels(25.4)).toBe(300);
    expect(printPixels(30)).toBe(354);
  });
});

describe('batchFromCsv', () => {
  it('makes one file per row, named from a column, with unique names', async () => {
    const csv =
      'name,url\nAda,https://a.test\nAda,https://b.test\nBo/b,https://c.test\n,\n';
    const files = await batchFromCsv(csv, 'url', {
      format: 'svg',
      nameColumn: 'name',
      style,
    });
    expect(files.map((f) => f.name)).toEqual([
      'Ada.svg',
      'Ada (2).svg',
      'Bo-b.svg',
    ]);
    expect(new TextDecoder().decode(files[0].bytes)).toMatch(/^<svg/);
  });
  it('refuses an unknown column', async () => {
    await expect(
      batchFromCsv('a\n1', 'b', { format: 'svg', style }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('reads columns and cleans names', () => {
    expect(readCsv('a,b\n1,2').columns).toEqual(['a', 'b']);
    expect(safeStem('  ../x  ')).toBe('x');
    expect(safeStem('')).toBe('qr');
  });
});

describe('QR settings and share', () => {
  it('settings hold no data fields', () => {
    assertNoDataFields(QR_DEFAULTS);
  });
  it('refuses WiFi share links and never offers them', () => {
    expect(canShareType('wifi')).toBe(false);
    expect(canShareType('url')).toBe(true);
    expect(
      parseQrShare({
        v: 1,
        type: 'wifi',
        fields: DEFAULT_FIELDS.wifi,
        style: { fg: '#000', bg: '#fff', ecc: 'M', margin: true },
      }),
    ).toBeNull();
  });
  it('coerces shared fields and style', () => {
    const s = parseQrShare({
      v: 1,
      type: 'email',
      fields: { to: 'a@b.c', subject: 3, evil: 'x' },
      style: { fg: 'red;}', bg: '#fff', ecc: 'Z', margin: false },
    });
    expect(s).toEqual({
      v: 1,
      type: 'email',
      fields: { to: 'a@b.c', subject: '', body: '' },
      style: { fg: '#000000', bg: '#fff', ecc: 'M', margin: false },
    });
    expect(parseQrShare({ v: 2, type: 'url' })).toBeNull();
  });
});
