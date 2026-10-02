import type { FieldOptions } from '@/shared/lib/data-formats/mock-schema';

/** `value` or `value: weight` per line. */
export function parseEnumLines(text: string): FieldOptions['enum'] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(.*?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(l);
      return m
        ? { value: m[1], weight: Number(m[2]) }
        : { value: l, weight: 1 };
    });
}
