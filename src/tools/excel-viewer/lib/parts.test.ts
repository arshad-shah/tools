/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { formatSerial, serialToDate } from './dates';
import {
  cellAddress,
  columnIndex,
  inRange,
  parseRange,
  parseRef,
  rangeAddress,
  shiftFormula,
} from './refs';
import { dateKindOfFormat, parseStyles } from './styles';
import { decodeEscapes, parseXml, resolvePart, stringItemText } from './xml';

describe('dates', () => {
  it('converts 1900-system serials, including the Lotus leap-year bug', () => {
    expect(formatSerial(1, 'date', false)).toBe('1900-01-01');
    expect(formatSerial(59, 'date', false)).toBe('1900-02-28');
    expect(formatSerial(60, 'date', false)).toBe('1900-02-29');
    expect(formatSerial(61, 'date', false)).toBe('1900-03-01');
    expect(formatSerial(45000, 'date', false)).toBe('2023-03-15');
    expect(formatSerial(0, 'time', false)).toBe('00:00:00');
  });

  it('converts 1904-system serials', () => {
    expect(formatSerial(0, 'date', true)).toBe('1904-01-01');
    expect(formatSerial(1, 'datetime', true)).toBe('1904-01-02 00:00:00');
  });

  it('rounds times to the second, carrying into the next day', () => {
    expect(formatSerial(45000.999999, 'datetime', false)).toBe(
      '2023-03-16 00:00:00',
    );
    expect(formatSerial(0.5, 'time', false)).toBe('12:00:00');
    expect(formatSerial(60.25, 'datetime', false)).toBe('1900-02-29 06:00:00');
  });

  it('formats durations past 24 hours and refuses negative dates', () => {
    expect(formatSerial(1.5, 'duration', false)).toBe('36:00:00');
    expect(formatSerial(-0.5, 'duration', false)).toBe('-12:00:00');
    expect(serialToDate(-1, false)).toBeNull();
    expect(formatSerial(-1, 'date', false)).toBe('-1');
  });
});

describe('number formats', () => {
  it('tells dates, times and durations from other formats', () => {
    expect(dateKindOfFormat('yyyy-mm-dd')).toBe('date');
    expect(dateKindOfFormat('[$-409]mmmm d, yyyy;@')).toBe('date');
    expect(dateKindOfFormat('d/m/yy h:mm')).toBe('datetime');
    expect(dateKindOfFormat('h:mm AM/PM')).toBe('time');
    expect(dateKindOfFormat('mm:ss')).toBe('time');
    expect(dateKindOfFormat('[h]:mm:ss')).toBe('duration');
    expect(dateKindOfFormat('General')).toBeNull();
    expect(dateKindOfFormat('0.00E+00')).toBeNull();
    expect(dateKindOfFormat('#,##0 "days"')).toBeNull();
    expect(dateKindOfFormat('[Red]0.00;[Blue]-0.00')).toBeNull();
    expect(dateKindOfFormat('0.0\\h')).toBeNull();
  });

  it('maps cell styles to formats, built-in and custom', () => {
    const s = parseStyles(
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts><numFmt numFmtId="200" formatCode="dd/mm/yyyy"/></numFmts><cellStyleXfs><xf numFmtId="14"/></cellStyleXfs><cellXfs><xf numFmtId="0"/><xf numFmtId="200"/><xf numFmtId="14"/><xf numFmtId="4"/><xf numFmtId="46"/></cellXfs></styleSheet>',
    );
    expect([0, 1, 2, 3, 4].map((i) => s.dateKindOf(i))).toEqual([
      null,
      'date',
      'date',
      null,
      'duration',
    ]);
    expect(s.formatOf(1)).toBe('dd/mm/yyyy');
    expect(s.formatOf(3)).toBe('#,##0.00');
    expect(s.formatOf(99)).toBe('General');
  });
});

describe('references', () => {
  it('parses and prints A1 references and ranges', () => {
    expect(columnIndex('A')).toBe(0);
    expect(columnIndex('AA')).toBe(26);
    expect(columnIndex('XFD')).toBe(16383);
    expect(parseRef('$B$3')).toEqual({ row: 2, col: 1 });
    expect(parseRef('3B')).toBeNull();
    const r = parseRange('C4:A1')!;
    expect(rangeAddress(r)).toBe('A1:C4');
    expect(inRange(r, { row: 3, col: 2 })).toBe(true);
    expect(inRange(r, { row: 4, col: 0 })).toBe(false);
    expect(cellAddress({ row: 0, col: 27 })).toBe('AB1');
  });

  it('moves the relative parts of a shared formula', () => {
    expect(shiftFormula('A1+$B$1+C$2+$D3', { row: 2, col: 1 })).toBe(
      'B3+$B$1+D$2+$D5',
    );
    expect(shiftFormula('SUM(A1:A3)*LOG10(B1)', { row: 1, col: 0 })).toBe(
      'SUM(A2:A4)*LOG10(B2)',
    );
    expect(
      shiftFormula('"A1"&\'My A1\'!A1&Sheet2!B2', { row: 1, col: 0 }),
    ).toBe('"A1"&\'My A1\'!A2&Sheet2!B3');
    expect(shiftFormula('A1', { row: -5, col: 0 })).toBe('A1');
  });
});

describe('xml helpers', () => {
  it('joins rich text runs and skips phonetic guides', () => {
    const doc = parseXml(
      '<si xmlns="urn:x"><r><t>a</t></r><r><t> b</t></r><rPh><t>x</t></rPh></si>',
      'test',
    );
    expect(stringItemText(doc.documentElement)).toBe('a b');
  });

  it('decodes Excel escapes', () => {
    expect(decodeEscapes('a_x000A_b')).toBe('a\nb');
    expect(decodeEscapes('_x005F_x0041_')).toBe('_x0041_');
  });

  it('resolves relationship targets', () => {
    expect(resolvePart('xl/workbook.xml', 'worksheets/sheet1.xml')).toBe(
      'xl/worksheets/sheet1.xml',
    );
    expect(resolvePart('xl/workbook.xml', '/xl/styles.xml')).toBe(
      'xl/styles.xml',
    );
    expect(resolvePart('xl/worksheets/sheet1.xml', '../drawings/d.xml')).toBe(
      'xl/drawings/d.xml',
    );
  });

  it('reports malformed XML', () => {
    expect(() => parseXml('<a><b></a>', 'part.xml')).toThrow(
      /part.xml is not well-formed/,
    );
  });
});
