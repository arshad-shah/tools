import type { AutofillKey } from './types';

/**
 * Label patterns for "My details" autofill (spec 8.4), a plain table so it
 * can be localised later. Order matters: specific keys come before the
 * generic "name" and "address".
 */
export const AUTOFILL_DICTIONARY: readonly {
  key: AutofillKey;
  pattern: RegExp;
}[] = [
  { key: 'surname', pattern: /\b(surname|last\s*name|family\s*name)\b/i },
  { key: 'firstName', pattern: /\b(first\s*name|forename|given\s*name)s?\b/i },
  { key: 'dob', pattern: /\b(date\s*of\s*birth|d\.?o\.?b\b\.?|birth\s*date)/i },
  { key: 'fullName', pattern: /\b(full\s*name|name)\b/i },
  { key: 'email', pattern: /\be-?mail\b/i },
  { key: 'address2', pattern: /\baddress(\s*line)?\s*2\b/i },
  { key: 'address3', pattern: /\baddress(\s*line)?\s*3\b/i },
  { key: 'address1', pattern: /\baddress(\s*line)?\s*1\b|\baddress\b/i },
  { key: 'town', pattern: /\b(town|city)\b/i },
  { key: 'county', pattern: /\b(county|state|province)\b/i },
  {
    key: 'postcode',
    pattern: /\b(post\s*code|postal\s*code|zip(\s*code)?|eircode)\b/i,
  },
  { key: 'country', pattern: /\bcountry\b/i },
  { key: 'phone', pattern: /\b(phone|telephone|tel|mobile)\b/i },
  { key: 'nationality', pattern: /\bnationality\b/i },
  { key: 'occupation', pattern: /\b(occupation|job\s*title|profession)\b/i },
];

/** The autofill key a label maps to, or null. */
export function autofillKey(label: string | null): AutofillKey | null {
  if (!label) return null;
  for (const { key, pattern } of AUTOFILL_DICTIONARY)
    if (pattern.test(label)) return key;
  return null;
}
