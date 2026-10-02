import { escapeVcard as e } from './escape';

export interface VcardFields {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  url: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  note: string;
}

/** vCard 3.0 with N and FN always present; empty fields left out. */
export function vcardPayload(f: VcardFields): string {
  const fn = [f.firstName, f.lastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${e(f.lastName.trim())};${e(f.firstName.trim())};;;`,
    `FN:${e(fn || f.org.trim())}`,
  ];
  const add = (prop: string, v: string) => {
    if (v.trim()) lines.push(`${prop}:${e(v.trim())}`);
  };
  add('ORG', f.org);
  add('TITLE', f.title);
  add('TEL;TYPE=WORK,VOICE', f.phone);
  add('TEL;TYPE=CELL', f.mobile);
  add('EMAIL', f.email);
  add('URL', f.url);
  const adr = [f.street, f.city, f.region, f.postcode, f.country];
  if (adr.some((p) => p.trim()))
    lines.push(`ADR;TYPE=WORK:;;${adr.map((p) => e(p.trim())).join(';')}`);
  add('NOTE', f.note);
  lines.push('END:VCARD');
  return lines.join('\n');
}
