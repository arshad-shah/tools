import type { SelectGroup, SelectItem } from '@/shared/ui';
import type { SavedFormat } from '../settings';
import { BUILTIN_FORMATS, getFormat } from './formats/index';
import type { FormatRef } from './model';

export const AUTO_FORMAT = 'auto';
const CUSTOM = 'custom:';

export const customFormatId = (name: string) => `${CUSTOM}${name}`;

/**
 * The worker's FormatRef for a `settings.format` id: 'auto', a built-in id
 * or `custom:<name>`. An unknown id falls back to auto-detect.
 */
export function toFormatRef(
  id: string,
  saved: readonly SavedFormat[],
): FormatRef {
  if (id.startsWith(CUSTOM)) {
    const f = saved.find((s) => customFormatId(s.name) === id);
    return f
      ? { kind: 'custom', name: f.name, pattern: f.pattern, flags: f.flags }
      : { kind: 'auto' };
  }
  if (id !== AUTO_FORMAT && getFormat(id)) return { kind: 'builtin', id };
  return { kind: 'auto' };
}

/** A readable name for a detected or chosen format id. */
export function formatName(id: string): string {
  if (id.startsWith(CUSTOM)) return id.slice(CUSTOM.length);
  return getFormat(id)?.label ?? id;
}

/** The format picker's options. */
export function formatOptions(saved: readonly SavedFormat[]): {
  items: SelectItem[];
  groups: SelectGroup[];
} {
  return {
    items: [{ value: AUTO_FORMAT, label: 'Auto-detect' }],
    groups: [
      {
        label: 'Built-in',
        items: BUILTIN_FORMATS.map((f) => ({ value: f.id, label: f.label })),
      },
      ...(saved.length
        ? [
            {
              label: 'Custom',
              items: saved.map((s) => ({
                value: customFormatId(s.name),
                label: s.name,
              })),
            },
          ]
        : []),
    ],
  };
}
