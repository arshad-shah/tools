import {
  fieldBounds,
  parseField,
  type CronFlavour,
  type FieldName,
} from './parse';

export type FieldMode = 'every' | 'specific' | 'range' | 'step';

export interface FieldSpec {
  mode: FieldMode;
  values?: number[];
  from?: number;
  to?: number;
  step?: number;
}

/**
 * One field's text from the editor's choices. A step from the field's
 * lowest value is `*`/n in Unix crons and from/n in Quartz (the forms each
 * documents); a later start becomes from-max/n in Unix.
 */
export function buildField(
  spec: FieldSpec,
  field: FieldName,
  flavour: CronFlavour = 'unix',
): string {
  const { min, max } = fieldBounds(field, flavour);
  switch (spec.mode) {
    case 'every':
      return '*';
    case 'specific': {
      const values = [...new Set(spec.values ?? [])].sort((a, b) => a - b);
      return values.length ? values.join(',') : '*';
    }
    case 'range': {
      const from = spec.from ?? min;
      const to = spec.to ?? max;
      const step = spec.step ?? 1;
      return step > 1 ? `${from}-${to}/${step}` : `${from}-${to}`;
    }
    case 'step': {
      const from = spec.from ?? min;
      const step = Math.max(1, spec.step ?? 1);
      if (flavour === 'quartz') return `${from}/${step}`;
      return from === min ? `*/${step}` : `${from}-${max}/${step}`;
    }
  }
}

/**
 * The editor's view of a field's text, or null when it mixes forms the
 * editor cannot show (it then offers the raw text only). Throws CronError
 * for invalid text.
 */
export function fieldToSpec(
  text: string,
  field: FieldName,
  flavour: CronFlavour = 'unix',
): FieldSpec | null {
  const f = parseField(field, text, flavour);
  const { max } = fieldBounds(field, flavour);
  if (f.any) return { mode: 'every' };
  if (f.items.every((i) => i.kind === 'value'))
    return {
      mode: 'specific',
      values: f.items.map((i) => (i.kind === 'value' ? i.value : 0)),
    };
  if (f.items.length !== 1) return null;
  const item = f.items[0];
  if (item.kind === 'step')
    return { mode: 'step', from: item.from, step: item.step };
  if (item.kind === 'range') {
    if (item.step > 1 && item.to === max && flavour !== 'quartz')
      return { mode: 'step', from: item.from, step: item.step };
    return item.step > 1
      ? { mode: 'range', from: item.from, to: item.to, step: item.step }
      : { mode: 'range', from: item.from, to: item.to };
  }
  return null;
}
