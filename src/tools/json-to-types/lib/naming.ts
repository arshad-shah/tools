/**
 * Identifier helpers shared by the inference and every emitter: splitting a
 * JSON key into words, casing, singular names for array items, and making
 * names unique within a scope.
 */

/** The words of a key: camelCase, snake_case, kebab-case and spaces split. */
export function words(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** A name that starts with a digit gets `prefix` in front. */
const leadDigit = (name: string, prefix: string) =>
  /^[0-9]/.test(name) ? prefix + name : name;

/** `first-name` to `FirstName`; `''` and symbol-only keys give `fallback`. */
export function pascalCase(key: string, fallback = 'Type'): string {
  const name = words(key).map(cap).join('');
  return name ? leadDigit(name, fallback) : fallback;
}

/** `first-name` to `firstName`. */
export function camelCase(key: string, fallback = 'field'): string {
  const ws = words(key);
  if (!ws.length) return fallback;
  const name =
    ws[0].toLowerCase() +
    ws
      .slice(1)
      .map((w) => cap(w.toLowerCase()))
      .join('');
  return leadDigit(name, fallback);
}

/** `firstName` to `first_name`. */
export function snakeCase(key: string, fallback = 'field'): string {
  const ws = words(key);
  if (!ws.length) return fallback;
  return leadDigit(ws.map((w) => w.toLowerCase()).join('_'), `${fallback}_`);
}

/** A rough English singular for naming array items: `addresses` to `address`. */
export function singular(word: string): string {
  const lower = word.toLowerCase();
  if (/(ss|us|is)$/.test(lower)) return word;
  if (/ies$/.test(lower) && word.length > 3) return `${word.slice(0, -3)}y`;
  if (/(sses|xes|ches|shes|zes)$/.test(lower)) return word.slice(0, -2);
  if (/s$/.test(lower) && word.length > 1) return word.slice(0, -1);
  return word;
}

/** A name for the items of an array under `key`. */
export function itemName(key: string): string {
  const name = pascalCase(key);
  const single = singular(name);
  return single !== name ? single : `${name}Item`;
}

/** A plain JavaScript identifier (no keywords check). */
export const isJsIdentifier = (s: string) => /^[A-Za-z_$][\w$]*$/.test(s);

/**
 * Hands out names unique within one scope: the first `Address` stays,
 * the next becomes `Address2`, then `Address3`.
 */
export class NameScope {
  private readonly used = new Set<string>();

  constructor(reserved: Iterable<string> = []) {
    for (const r of reserved) this.used.add(r.toLowerCase());
  }

  take(name: string): string {
    let candidate = name;
    for (let n = 2; this.used.has(candidate.toLowerCase()); n++)
      candidate = `${name}${n}`;
    this.used.add(candidate.toLowerCase());
    return candidate;
  }
}

/** A double-quoted string literal (JSON escaping suits every target). */
export const quote = (s: string) => JSON.stringify(s);
