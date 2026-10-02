import { unit as mathUnit, type Unit as MathUnit } from 'mathjs';
import { CATEGORIES, type Category, type Unit } from './units';

export interface FreeTextResult {
  category: string;
  /** Unit id the value is in. */
  from: string;
  value: number;
  /** Unit id to convert to, when the text names one ("to cm"). */
  to?: string;
}

type Hit = { category: Category; unit: Unit };

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/\^/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Shorthands people type that are not a unit's id, symbol or label.
const EXTRA: Record<string, [string, string]> = {
  "'": ['length', 'ft'],
  '"': ['length', 'in'],
  f: ['temperature', 'f'],
  c: ['temperature', 'c'],
  k: ['temperature', 'k'],
  degf: ['temperature', 'f'],
  degc: ['temperature', 'c'],
  '°f': ['temperature', 'f'],
  '°c': ['temperature', 'c'],
  meter: ['length', 'm'],
  meters: ['length', 'm'],
  metre: ['length', 'm'],
  foot: ['length', 'ft'],
  feet: ['length', 'ft'],
  inch: ['length', 'in'],
  inches: ['length', 'in'],
  lbs: ['mass', 'lb'],
  pound: ['mass', 'lb'],
  hr: ['time', 'h'],
  hrs: ['time', 'h'],
  sec: ['time', 's'],
  secs: ['time', 's'],
  mins: ['time', 'min'],
  kph: ['speed', 'kmh'],
  kmph: ['speed', 'kmh'],
  gallon: ['volume', 'gal-us'],
  gallons: ['volume', 'gal-us'],
};

/** Case-sensitive symbols first (MB vs mb), then folded names. */
function buildIndex() {
  const exact = new Map<string, Hit>();
  const folded = new Map<string, Hit>();
  for (const category of CATEGORIES)
    for (const unit of category.units) {
      const hit = { category, unit };
      if (!exact.has(unit.symbol)) exact.set(unit.symbol, hit);
      const label = fold(unit.label);
      for (const key of [
        fold(unit.id),
        fold(unit.symbol),
        label,
        label.replace(/s$/, ''),
        label.replace(/\s*\(.*\)$/, ''),
      ])
        if (key && !folded.has(key)) folded.set(key, hit);
    }
  for (const [key, [c, u]] of Object.entries(EXTRA)) {
    const category = CATEGORIES.find((x) => x.id === c)!;
    folded.set(key, {
      category,
      unit: category.units.find((x) => x.id === u)!,
    });
  }
  return { exact, folded };
}

let index: ReturnType<typeof buildIndex> | null = null;

function lookup(text: string, within?: Category): Hit | null {
  index ??= buildIndex();
  const t = text.trim();
  if (within) {
    const u =
      within.units.find((x) => x.symbol === t) ??
      within.units.find((x) =>
        [x.id, x.symbol, x.label, x.label.replace(/s$/, '')]
          .map(fold)
          .includes(fold(t)),
      );
    if (u) return { category: within, unit: u };
  }
  const hit = index.exact.get(t) ?? index.folded.get(fold(t)) ?? null;
  return hit && (!within || hit.category === within) ? hit : null;
}

// mathjs base units for the categories it knows, to map its parse onto ours.
const MATH_BASE: [string, string][] = [
  ['length', 'm'],
  ['mass', 'kg'],
  ['volume', 'L'],
  ['temperature', 'degC'],
  ['area', 'm^2'],
  ['speed', 'm/s'],
  ['time', 's'],
  ['data', 'B'],
  ['pressure', 'Pa'],
  ['energy', 'J'],
  ['power', 'W'],
  ['force', 'N'],
  ['angle', 'deg'],
  ['frequency', 'Hz'],
  ['density', 'kg/m^3'],
];

const UNIT_NAMES: Record<string, string> = {
  m: 'm',
  kg: 'kg',
  L: 'l',
  degC: 'c',
  'm^2': 'm2',
  'm/s': 'mps',
  s: 's',
  B: 'B',
  Pa: 'Pa',
  J: 'J',
  W: 'W',
  N: 'N',
  deg: 'deg',
  Hz: 'Hz',
  'kg/m^3': 'kgm3',
};

/** A quantity mathjs can read, as a value in one of our base units. */
function viaMathjs(text: string): FreeTextResult | null {
  let u: MathUnit;
  try {
    u = mathUnit(text);
  } catch {
    return null;
  }
  for (const [category, base] of MATH_BASE) {
    try {
      if (!u.equalBase(mathUnit(base))) continue;
      return { category, from: UNIT_NAMES[base], value: u.toNumber(base) };
    } catch {
      // Not convertible to this base.
    }
  }
  return null;
}

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const PART = new RegExp(
  String.raw`\s*(${NUMBER})\s*([^\d\s+.-][^\d]*?)\s*(?=[+-]?\d|\.\d|$)`,
  'iy',
);

/**
 * Reads a conversion typed as text (spec §8.5): "5 ft 3 in to cm" (compound
 * quantities are summed into the last unit), "72F" (temperature shorthand),
 * "3 kg in lb", or anything else mathjs can read as a unit. Null when the
 * text is not a quantity of a known unit.
 */
export function parseFreeText(text: string): FreeTextResult | null {
  const t = text.trim();
  if (!t) return null;
  const split = /^(.*\S)\s+(?:to|in|into|as)\s+(\S.*)$/i.exec(t);
  const left = split ? split[1] : t;
  const right = split?.[2];

  let result: FreeTextResult | null = null;
  const parts: { value: number; hit: Hit }[] = [];
  PART.lastIndex = 0;
  let ok = true;
  while (PART.lastIndex < left.length) {
    const m = PART.exec(left);
    if (!m) {
      ok = false;
      break;
    }
    const hit = lookup(m[2], parts[0]?.hit.category);
    if (!hit) {
      ok = false;
      break;
    }
    parts.push({ value: Number(m[1]), hit });
  }
  if (ok && parts.length > 0) {
    const last = parts[parts.length - 1].hit;
    const base = parts.reduce((sum, p) => sum + p.hit.unit.toBase(p.value), 0);
    result = {
      category: last.category.id,
      from: last.unit.id,
      // Twelve significant digits hide the float noise of the sum.
      value:
        parts.length === 1
          ? parts[0].value
          : Number(last.unit.fromBase(base).toPrecision(12)),
    };
  } else if (new RegExp(String.raw`^${NUMBER}\s*[^\d]+$`, 'i').test(left)) {
    // One quantity in a unit we do not list: mathjs may still know it.
    result = viaMathjs(left);
  }
  if (!result || !Number.isFinite(result.value)) return null;
  if (right !== undefined) {
    const category = CATEGORIES.find((c) => c.id === result.category)!;
    const to = lookup(right, category);
    if (!to) return null;
    result.to = to.unit.id;
  }
  return result;
}
