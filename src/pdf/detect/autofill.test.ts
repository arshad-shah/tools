import { describe, expect, it } from 'vitest';
import { AUTOFILL_DICTIONARY, autofillKey } from './autofill';

describe('autofillKey', () => {
  it.each([
    ['Surname', 'surname'],
    ['Last name', 'surname'],
    ['Family name', 'surname'],
    ['First name', 'firstName'],
    ['Forename(s)', 'firstName'],
    ['Given names', 'firstName'],
    ['Full name', 'fullName'],
    ['Name', 'fullName'],
    ['Address', 'address1'],
    ['Address line 1', 'address1'],
    ['Address line 2', 'address2'],
    ['Address 3', 'address3'],
    ['Town / City', 'town'],
    ['County', 'county'],
    ['Post code', 'postcode'],
    ['Postcode', 'postcode'],
    ['ZIP', 'postcode'],
    ['Eircode', 'postcode'],
    ['Country', 'country'],
    ['E-mail', 'email'],
    ['Email address', 'email'],
    ['Tel', 'phone'],
    ['Telephone', 'phone'],
    ['Mobile', 'phone'],
    ['Date of birth', 'dob'],
    ['D.O.B.', 'dob'],
    ['Nationality', 'nationality'],
    ['Occupation', 'occupation'],
    ['Job title', 'occupation'],
  ])('%s -> %s', (label, key) => {
    expect(autofillKey(label)).toBe(key);
  });

  it('returns null for unknown or missing labels', () => {
    expect(autofillKey(null)).toBeNull();
    expect(autofillKey('Relationship')).toBeNull();
    expect(autofillKey('Notes')).toBeNull();
  });

  it('is a plain table of keys and patterns', () => {
    expect(AUTOFILL_DICTIONARY.length).toBeGreaterThanOrEqual(15);
    expect(AUTOFILL_DICTIONARY.every((e) => e.pattern instanceof RegExp)).toBe(
      true,
    );
  });
});
