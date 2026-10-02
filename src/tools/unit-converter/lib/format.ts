/**
 * Unit Converter number formatting (spec §8.5): significant digits rather
 * than fixed decimals, and an exponent for magnitudes below 1e-6 or from
 * 1e15, so a tiny value such as 1 eV in joules never shows as 0.
 */
export function formatNumber(
  v: number,
  { significant = 10, locale }: { significant?: number; locale?: string } = {},
): string {
  if (Number.isNaN(v)) return '';
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const digits = Math.min(21, Math.max(1, Math.round(significant)));
  const abs = Math.abs(v);
  if (abs < 1e-6 || abs >= 1e15) {
    const [mantissa, exp] = v.toExponential(digits - 1).split('e');
    const m = trimZeros(mantissa);
    return `${localiseDecimal(m, locale)}e${exp}`;
  }
  // Between 1e-6 and 1e15 String() never uses an exponent.
  return localiseDecimal(String(Number(v.toPrecision(digits))), locale);
}

const trimZeros = (s: string) =>
  s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;

function decimalMark(locale: string): string {
  return (
    new Intl.NumberFormat(locale)
      .formatToParts(1.5)
      .find((p) => p.type === 'decimal')?.value ?? '.'
  );
}

function groupMark(locale: string): string {
  return (
    new Intl.NumberFormat(locale)
      .formatToParts(1234567)
      .find((p) => p.type === 'group')?.value ?? ','
  );
}

const localiseDecimal = (s: string, locale?: string) =>
  locale ? s.replace('.', decimalMark(locale)) : s;

/**
 * Reads a number typed with `locale`'s marks: `1,5` in de-DE is 1.5 and
 * group marks are ignored. Exponents (`2.5e3`) are accepted. Null when the
 * text is not a number.
 */
export function parseLocaleNumber(text: string, locale: string): number | null {
  const dec = decimalMark(locale);
  const group = groupMark(locale);
  let t = text.trim().replace(/\s/g, '');
  if (group !== dec) t = t.split(group).join('');
  if (dec !== '.') t = t.replace(dec, '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
