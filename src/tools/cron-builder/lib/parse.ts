import { ToolError } from '@/shared/lib/errors';

export type CronFlavour = 'unix' | 'seconds' | 'quartz';

export type FieldName =
  | 'second'
  | 'minute'
  | 'hour'
  | 'dom'
  | 'month'
  | 'dow'
  | 'year';

/**
 * One comma-separated part of a field, with values as typed (day-of-week
 * numbers stay in the flavour's own numbering; see `normaliseDow`).
 */
export type CronItem =
  | { kind: 'all' }
  | { kind: 'value'; value: number }
  | { kind: 'range'; from: number; to: number; step: number }
  | { kind: 'step'; from: number; step: number }
  | { kind: 'last'; offset: number }
  | { kind: 'last-weekday' }
  | { kind: 'nearest-weekday'; day: number }
  | { kind: 'last-dow'; dow: number }
  | { kind: 'nth-dow'; dow: number; n: number };

export interface CronField {
  name: FieldName;
  /** The field as typed. */
  text: string;
  /** 1-based column of the field in the expression. */
  column: number;
  /** `*` (or `?`): the field does not restrict. */
  any: boolean;
  /** Quartz `?`: no specific value. */
  question: boolean;
  items: CronItem[];
  /** Every plain value the items allow (specials such as L are matched by date). */
  values: Set<number>;
}

export type CronMacro =
  | '@yearly'
  | '@monthly'
  | '@weekly'
  | '@daily'
  | '@hourly'
  | '@reboot';

export interface CronAst {
  flavour: CronFlavour;
  macro?: CronMacro;
  /** `@reboot`: runs at startup only, no scheduled times. */
  reboot: boolean;
  second: CronField;
  minute: CronField;
  hour: CronField;
  dom: CronField;
  month: CronField;
  dow: CronField;
  year?: CronField;
}

/** A parse error naming the field and the 1-based column it points at. */
export class CronError extends ToolError {
  readonly field?: FieldName;
  readonly column: number;

  constructor(message: string, column: number, field?: FieldName) {
    super('INVALID_INPUT', message);
    this.field = field;
    this.column = column;
  }
}

export const FIELD_LABELS: Record<FieldName, string> = {
  second: 'Second',
  minute: 'Minute',
  hour: 'Hour',
  dom: 'Day of month',
  month: 'Month',
  dow: 'Day of week',
  year: 'Year',
};

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MACROS: Record<string, { macro: CronMacro; fields: string }> = {
  '@yearly': { macro: '@yearly', fields: '0 0 1 1 *' },
  '@annually': { macro: '@yearly', fields: '0 0 1 1 *' },
  '@monthly': { macro: '@monthly', fields: '0 0 1 * *' },
  '@weekly': { macro: '@weekly', fields: '0 0 * * 0' },
  '@daily': { macro: '@daily', fields: '0 0 * * *' },
  '@midnight': { macro: '@daily', fields: '0 0 * * *' },
  '@hourly': { macro: '@hourly', fields: '0 * * * *' },
  '@reboot': { macro: '@reboot', fields: '* * * * *' },
};

const LAYOUTS: Record<CronFlavour, FieldName[]> = {
  unix: ['minute', 'hour', 'dom', 'month', 'dow'],
  seconds: ['second', 'minute', 'hour', 'dom', 'month', 'dow'],
  quartz: ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'],
};

const HINTS: Record<CronFlavour, string> = {
  unix: '5 fields (minute hour day-of-month month day-of-week)',
  seconds: '6 fields (second minute hour day-of-month month day-of-week)',
  quartz:
    '6 or 7 fields (second minute hour day-of-month month day-of-week year)',
};

/** A day-of-week number in `flavour`'s numbering as 0 (Sunday) to 6. */
export const normaliseDow = (v: number, flavour: CronFlavour): number =>
  flavour === 'quartz' ? v - 1 : v % 7;

interface Bounds {
  min: number;
  max: number;
}

function bounds(name: FieldName, flavour: CronFlavour): Bounds {
  switch (name) {
    case 'second':
    case 'minute':
      return { min: 0, max: 59 };
    case 'hour':
      return { min: 0, max: 23 };
    case 'dom':
      return { min: 1, max: 31 };
    case 'month':
      return { min: 1, max: 12 };
    case 'dow':
      return flavour === 'quartz' ? { min: 1, max: 7 } : { min: 0, max: 7 };
    case 'year':
      return { min: 1970, max: 2099 };
  }
}

/** Splits on whitespace, keeping each token's 1-based column. */
function tokens(text: string): { text: string; column: number }[] {
  const out: { text: string; column: number }[] = [];
  const re = /\S+/g;
  for (let m = re.exec(text); m; m = re.exec(text))
    out.push({ text: m[0], column: m.index + 1 });
  return out;
}

class FieldParser {
  constructor(
    private name: FieldName,
    private flavour: CronFlavour,
  ) {}

  private fail(message: string, column: number): never {
    throw new CronError(
      `${FIELD_LABELS[this.name]}: ${message}`,
      column,
      this.name,
    );
  }

  private quartzOnly(what: string, column: number) {
    if (this.flavour !== 'quartz')
      this.fail(`${what} is only valid in Quartz expressions`, column);
  }

  /** A number or a month or day name, checked against the field's range. */
  private value(text: string, column: number): number {
    const upper = text.toUpperCase();
    let v: number;
    if (/^\d+$/.test(text)) v = Number(text);
    else if (this.name === 'month' && MONTHS.includes(upper))
      v = MONTHS.indexOf(upper) + 1;
    else if (this.name === 'dow' && DAYS.includes(upper))
      v = DAYS.indexOf(upper) + (this.flavour === 'quartz' ? 1 : 0);
    else
      this.fail(
        text === ''
          ? 'a value is missing'
          : `"${text}" is not a number or name`,
        column,
      );
    const { min, max } = bounds(this.name, this.flavour);
    if (v < min || v > max)
      this.fail(`${v} is out of range ${min}-${max}`, column);
    return v;
  }

  private step(text: string, column: number): number {
    if (!/^\d+$/.test(text))
      this.fail(`step "${text}" is not a number`, column);
    const s = Number(text);
    if (s < 1) this.fail(`step ${s} must be at least 1`, column);
    return s;
  }

  private item(part: string, column: number): CronItem {
    const upper = part.toUpperCase();
    if (part === '*') return { kind: 'all' };
    if (this.name === 'dom') {
      if (upper === 'L') {
        this.quartzOnly('L', column);
        return { kind: 'last', offset: 0 };
      }
      const lm = /^L-(\d+)$/.exec(upper);
      if (lm) {
        this.quartzOnly('L', column);
        const offset = Number(lm[1]);
        if (offset > 30)
          this.fail(`L-${offset} is out of range L-0 to L-30`, column);
        return { kind: 'last', offset };
      }
      if (upper === 'LW') {
        this.quartzOnly('LW', column);
        return { kind: 'last-weekday' };
      }
      const wm = /^(\d+)W$/.exec(upper);
      if (wm) {
        this.quartzOnly('W', column);
        return { kind: 'nearest-weekday', day: this.value(wm[1], column) };
      }
    }
    if (this.name === 'dow') {
      const lm = /^([A-Z]{3}|\d)L$/.exec(upper);
      if (lm) {
        this.quartzOnly('L', column);
        return { kind: 'last-dow', dow: this.value(lm[1], column) };
      }
      if (upper === 'L') {
        this.quartzOnly('L', column);
        return { kind: 'value', value: 7 };
      }
      const hm = /^([A-Z]{3}|\d)#(\d+)$/.exec(upper);
      if (hm) {
        this.quartzOnly('#', column);
        const n = Number(hm[2]);
        if (n < 1 || n > 5)
          this.fail(`#${n} is out of range 1-5`, column + hm[1].length + 1);
        return { kind: 'nth-dow', dow: this.value(hm[1], column), n };
      }
    }
    const slash = part.indexOf('/');
    if (slash >= 0) {
      const head = part.slice(0, slash);
      const step = this.step(part.slice(slash + 1), column + slash + 1);
      if (head === '*' || head === '')
        return {
          kind: 'step',
          from: bounds(this.name, this.flavour).min,
          step,
        };
      if (head.includes('-')) {
        const r = this.range(head, column);
        return { ...r, step };
      }
      return { kind: 'step', from: this.value(head, column), step };
    }
    if (part.includes('-')) return { ...this.range(part, column), step: 1 };
    return { kind: 'value', value: this.value(part, column) };
  }

  private range(
    text: string,
    column: number,
  ): { kind: 'range'; from: number; to: number } {
    const dash = text.indexOf('-');
    const from = this.value(text.slice(0, dash), column);
    const to = this.value(text.slice(dash + 1), column + dash + 1);
    // Unix 7 is Sunday, so 5-7 (Friday to Sunday) is a valid range.
    if (from > to) this.fail(`range ${text} runs backwards`, column);
    return { kind: 'range', from, to };
  }

  parse(text: string, column: number): CronField {
    const field: CronField = {
      name: this.name,
      text,
      column,
      any: false,
      question: false,
      items: [],
      values: new Set(),
    };
    if (text === '?') {
      if (this.name !== 'dom' && this.name !== 'dow')
        this.fail('? is only valid in day of month or day of week', column);
      if (this.flavour === 'unix')
        this.fail('? is only valid in Quartz expressions', column);
      field.any = true;
      field.question = true;
      return field;
    }
    let offset = 0;
    for (const part of text.split(',')) {
      if (part === '') this.fail('a value is missing', column + offset);
      field.items.push(this.item(part, column + offset));
      offset += part.length + 1;
    }
    field.any = field.items.some((i) => i.kind === 'all');
    const { min, max } = bounds(this.name, this.flavour);
    const add = (v: number) =>
      field.values.add(this.name === 'dow' ? normaliseDow(v, this.flavour) : v);
    for (const item of field.items) {
      if (item.kind === 'all') for (let v = min; v <= max; v++) add(v);
      else if (item.kind === 'value') add(item.value);
      else if (item.kind === 'range')
        for (let v = item.from; v <= item.to; v += item.step) add(v);
      else if (item.kind === 'step')
        for (let v = item.from; v <= max; v += item.step) add(v);
    }
    return field;
  }
}

const anyField = (name: FieldName, flavour: CronFlavour, text = '*') =>
  new FieldParser(name, flavour).parse(text, 0);

/**
 * Parses a cron expression (spec §9.7): Unix 5-field, 6-field with seconds,
 * or Quartz 6/7-field with `?`, `L`, `W` and `#`, plus the `@` macros.
 * Lists, ranges, steps and month and day names are accepted. Errors are
 * `CronError` (INVALID_INPUT) with the field and 1-based column, for
 * example "Day of month: 32 is out of range 1-31".
 */
export function parseCron(expr: string, flavour: CronFlavour): CronAst {
  const trimmed = expr.trim();
  if (trimmed === '') throw new CronError(`Enter ${HINTS[flavour]}`, 1);
  if (trimmed.startsWith('@')) {
    const m = MACROS[trimmed.toLowerCase()];
    if (!m)
      throw new CronError(
        `Unknown macro "${trimmed}"; use @yearly, @monthly, @weekly, @daily, @hourly or @reboot`,
        expr.indexOf('@') + 1,
      );
    const ast = parseCron(m.fields, 'unix');
    return { ...ast, flavour, macro: m.macro, reboot: m.macro === '@reboot' };
  }
  const parts = tokens(expr);
  const layout = LAYOUTS[flavour];
  const optionalYear = flavour === 'quartz' && parts.length === 6;
  if (parts.length !== layout.length && !optionalYear) {
    const column =
      parts.length > layout.length
        ? parts[layout.length].column
        : expr.trimEnd().length + 1;
    throw new CronError(
      `Expected ${HINTS[flavour]}, found ${parts.length}`,
      column,
    );
  }
  const fields = {} as Record<FieldName, CronField>;
  layout.forEach((name, i) => {
    if (parts[i])
      fields[name] = new FieldParser(name, flavour).parse(
        parts[i].text,
        parts[i].column,
      );
  });
  if (flavour === 'quartz') {
    const { dom, dow } = fields;
    if (dom.question === dow.question)
      throw new CronError(
        dom.question
          ? 'Day of week: only one of day of month and day of week can be ?'
          : 'Day of week: Quartz needs ? in day of month or day of week',
        dow.column,
        'dow',
      );
  }
  return {
    flavour,
    reboot: false,
    second: fields.second ?? anyField('second', 'unix', '0'),
    minute: fields.minute,
    hour: fields.hour,
    dom: fields.dom,
    month: fields.month,
    dow: fields.dow,
    ...(fields.year ? { year: fields.year } : {}),
  };
}

/** Parses one field on its own (the per-field editors); column 1 based. */
export function parseField(
  name: FieldName,
  text: string,
  flavour: CronFlavour,
): CronField {
  return new FieldParser(name, flavour).parse(text, 1);
}

/** The lowest and highest value a field takes in `flavour`. */
export function fieldBounds(
  name: FieldName,
  flavour: CronFlavour,
): { min: number; max: number } {
  return bounds(name, flavour);
}
