import { escapeRecord as e } from './escape';

export interface MecardFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  url: string;
  address: string;
  note: string;
}

/** `MECARD:N:last,first;TEL:...;;` (compact contact for small codes). */
export function mecardPayload(f: MecardFields): string {
  const parts = [`N:${e(f.lastName.trim())},${e(f.firstName.trim())}`];
  const add = (k: string, v: string) => {
    if (v.trim()) parts.push(`${k}:${e(v.trim())}`);
  };
  add('TEL', f.phone);
  add('EMAIL', f.email);
  add('URL', f.url);
  add('ADR', f.address);
  add('NOTE', f.note);
  return `MECARD:${parts.join(';')};;`;
}
