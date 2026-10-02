import type { CronAst, CronField, CronItem } from './parse';
import { normaliseDow } from './parse';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth'];

const p2 = (n: number) => String(n).padStart(2, '0');

/** "a", "a and b", "a, b and c". */
function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const plural = (n: number, word: string) => (n === 1 ? word : `${n} ${word}s`);

/** A single value the field is fixed to, if it has exactly one. */
const single = (f: CronField): number | null =>
  f.items.length === 1 && f.items[0].kind === 'value' ? f.items[0].value : null;

/** Only plain values (no ranges or steps), up to `max` of them. */
const plainValues = (f: CronField, max: number): number[] | null =>
  f.items.every((i) => i.kind === 'value') && f.items.length <= max
    ? [...f.values].sort((a, b) => a - b)
    : null;

const stepOf = (f: CronField): number | null => {
  if (f.items.length !== 1) return null;
  const i = f.items[0];
  return i.kind === 'step' && (i.from === 0 || f.text.startsWith('*'))
    ? i.step
    : null;
};

const clock = (h: number, m: number, s = 0) =>
  `${p2(h)}:${p2(m)}${s ? `:${p2(s)}` : ''}`;

/** "5", "1 to 5", "every 3 from 0" style text for one item. */
function itemText(i: CronItem, name: (v: number) => string): string {
  switch (i.kind) {
    case 'value':
      return name(i.value);
    case 'range':
      return i.step > 1
        ? `every ${i.step} from ${name(i.from)} to ${name(i.to)}`
        : `${name(i.from)} to ${name(i.to)}`;
    case 'step':
      return `every ${i.step} starting at ${name(i.from)}`;
    default:
      return '';
  }
}

const fieldText = (f: CronField, name: (v: number) => string) =>
  list(f.items.map((i) => itemText(i, name)));

function hourSpan(f: CronField): string {
  const step = stepOf(f);
  if (step) return `every ${plural(step, 'hour')}`;
  if (
    f.items.length === 1 &&
    f.items[0].kind === 'range' &&
    f.items[0].step === 1
  )
    return `between ${clock(f.items[0].from, 0)} and ${clock(f.items[0].to, 59)}`;
  const h = single(f);
  if (h !== null) return `between ${clock(h, 0)} and ${clock(h, 59)}`;
  return `during hours ${fieldText(f, String)}`;
}

function timePhrase(ast: CronAst): string {
  const { second: S, minute: M, hour: H } = ast;
  const s = single(S);
  const m = single(M);
  const h = single(H);
  if (s !== null && m !== null && h !== null) return `At ${clock(h, m, s)}`;
  const hs = plainValues(H, 6);
  const ms = plainValues(M, 6);
  if (s !== null && hs && ms && hs.length * ms.length <= 6)
    return `At ${list(hs.flatMap((hh) => ms.map((mm) => clock(hh, mm, s))))}`;

  let lead: string;
  if (s === null) {
    const step = stepOf(S);
    lead = S.any
      ? 'Every second'
      : step
        ? `Every ${plural(step, 'second')}`
        : `At second ${fieldText(S, String)}`;
    if (!M.any) lead += `, at minute ${fieldText(M, String)}`;
  } else if (M.any) lead = 'Every minute';
  else if (stepOf(M)) lead = `Every ${plural(stepOf(M)!, 'minute')}`;
  else if (m === 0 && H.any)
    return s ? `At second ${s} of every hour` : 'Every hour';
  else if (m === 0 && stepOf(H)) return `Every ${plural(stepOf(H)!, 'hour')}`;
  else lead = `At minute ${fieldText(M, String)}`;

  if (H.any)
    return M.any || s === null || stepOf(M) ? lead : `${lead} past every hour`;
  return `${lead} ${hourSpan(H)}`;
}

function monthText(f: CronField): string {
  if (f.any) return 'every month';
  const step = stepOf(f);
  if (step) return `every ${plural(step, 'month')}`;
  return fieldText(f, (v) => MONTH_NAMES[v - 1]);
}

function domPhrase(ast: CronAst): string {
  const months = monthText(ast.month);
  const f = ast.dom;
  const parts = f.items.map((i) => {
    switch (i.kind) {
      case 'last':
        return i.offset
          ? `${plural(i.offset, 'day')} before the last day`
          : 'the last day';
      case 'last-weekday':
        return 'the last weekday';
      case 'nearest-weekday':
        return `the weekday nearest day ${i.day}`;
      default:
        return null;
    }
  });
  if (parts.every((p) => p !== null))
    return `on ${list(parts as string[])} of ${months}`;
  const step = stepOf(f);
  if (step) return `on every ${plural(step, 'day')} of ${months}`;
  const days = fieldText(f, String);
  const one = single(f) !== null;
  return `on ${one ? 'day' : 'days'} ${days} of ${months}`;
}

function dowPhrase(ast: CronAst): string {
  const name = (v: number) => DAY_NAMES[normaliseDow(v, ast.flavour)];
  const f = ast.dow;
  const ofMonth = ast.month.any
    ? 'of every month'
    : `of ${monthText(ast.month)}`;
  const parts = f.items.map((i) => {
    switch (i.kind) {
      case 'nth-dow':
        return `the ${ORDINALS[i.n]} ${name(i.dow)} ${ofMonth}`;
      case 'last-dow':
        return `the last ${name(i.dow)} ${ofMonth}`;
      case 'range': {
        const from = name(i.from);
        const to = name(i.to);
        if (i.step > 1) return `every ${i.step} days from ${from} to ${to}`;
        return from === 'Monday' && to === 'Friday'
          ? 'every weekday from Monday to Friday'
          : `every day from ${from} to ${to}`;
      }
      case 'step':
        return `every ${i.step} days of the week starting on ${name(i.from)}`;
      case 'value':
        return name(i.value);
      default:
        return '';
    }
  });
  const special = f.items.some(
    (i) => i.kind === 'nth-dow' || i.kind === 'last-dow',
  );
  const text = `on ${list(parts)}`;
  return special || ast.month.any ? text : `${text} in ${monthText(ast.month)}`;
}

function dayPhrase(ast: CronAst): string {
  const domR = !ast.dom.any && !ast.dom.text.startsWith('*');
  const dowR = !ast.dow.any && !ast.dow.text.startsWith('*');
  if (ast.flavour !== 'quartz' && domR && dowR)
    return `${domPhrase(ast)} or ${dowPhrase(ast)}`;
  if (domR) return domPhrase(ast);
  if (dowR) return dowPhrase(ast);
  if (!ast.month.any) return `every day in ${monthText(ast.month)}`;
  return '';
}

const MACRO_TEXT: Record<string, string> = {
  '@yearly': 'Once a year, at 00:00 on 1 January',
  '@monthly': 'Once a month, at 00:00 on day 1',
  '@weekly': 'Once a week, at 00:00 on Sunday',
  '@daily': 'Once a day, at 00:00',
  '@hourly': 'Every hour',
  '@reboot': 'At startup (no scheduled times)',
};

/**
 * An English sentence for a parsed schedule (spec §9.7): "At 09:30 on
 * every weekday from Monday to Friday", "Every 5 minutes", "At 12:00 on
 * the second Monday of every month". Unix crons that restrict both day
 * fields read "or", matching their either-day semantics.
 */
export function explainCron(ast: CronAst): string {
  if (ast.macro) return MACRO_TEXT[ast.macro];
  const time = timePhrase(ast);
  let day = dayPhrase(ast);
  if (!day && /^At \d\d:\d\d/.test(time)) day = 'every day';
  let out = day ? `${time} ${day}` : time;
  if (ast.year && !ast.year.any) out += ` in ${fieldText(ast.year, String)}`;
  return out;
}
