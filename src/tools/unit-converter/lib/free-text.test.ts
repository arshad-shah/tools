import { describe, expect, it } from 'vitest';
import { convert } from './convert';
import { parseFreeText } from './free-text';
import { findUnit, getCategory } from './units';

const result = (text: string, to?: string) => {
  const r = parseFreeText(text)!;
  const c = getCategory(r.category)!;
  return convert(r.value, findUnit(c, r.from)!, findUnit(c, to ?? r.to!)!);
};

describe('parseFreeText', () => {
  it('sums compound lengths into the last unit', () => {
    expect(parseFreeText('5 ft 3 in to cm')).toEqual({
      category: 'length',
      from: 'in',
      value: 63,
      to: 'cm',
    });
    expect(result('5 ft 3 in to cm')).toBeCloseTo(160.02, 10);
    expect(result(`5' 3" to cm`)).toBeCloseTo(160.02, 10);
  });
  it('reads a temperature shorthand', () => {
    expect(parseFreeText('72F')).toMatchObject({
      category: 'temperature',
      from: 'f',
      value: 72,
    });
    expect(result('72F', 'c')).toBeCloseTo(22.222, 3);
  });
  it('reads symbols, names and case-sensitive data units', () => {
    expect(parseFreeText('3 kg in lb')).toMatchObject({
      category: 'mass',
      to: 'lb',
    });
    expect(parseFreeText('2 MiB')).toMatchObject({
      category: 'data',
      from: 'MiB',
    });
    expect(parseFreeText('10 miles to km')).toMatchObject({
      category: 'length',
      from: 'mi',
      to: 'km',
    });
    expect(parseFreeText('1.5e3 m')).toMatchObject({ value: 1500 });
  });
  it('falls back to mathjs units', () => {
    const r = parseFreeText('2 rod')!;
    expect(r.category).toBe('length');
    expect(r.from).toBe('m');
    expect(r.value).toBeCloseTo(10.0584, 6);
  });
  it('gives null for garbage', () => {
    expect(parseFreeText('hello world')).toBeNull();
    expect(parseFreeText('')).toBeNull();
    expect(parseFreeText('5 ft to kg')).toBeNull();
    expect(parseFreeText('5 ft 3 kg')).toBeNull();
  });
});
