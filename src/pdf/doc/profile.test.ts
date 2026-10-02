import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openIdb } from '@/shared/lib/storage';
import type { DetectedField } from '@/pdf/detect';
import type { FormWidget } from '@/pdf/edit/forms';
import {
  autofillPlan,
  clearMyDetails,
  EMPTY_DETAILS,
  formatDob,
  loadMyDetails,
  saveMyDetails,
  widgetFieldId,
} from './profile';

const field = (
  id: string,
  label: string,
  autofill: DetectedField['autofill'],
  type: DetectedField['type'] = 'text',
): DetectedField => ({
  id,
  pageIndex: 0,
  rect: { x: 0, y: 0, width: 100, height: 20 },
  type,
  label,
  autofill,
  confidence: 0.9,
  status: 'field',
  source: 'cell',
});

const details = {
  ...EMPTY_DETAILS,
  surname: 'Doe',
  firstName: 'Jane',
  postcode: 'D02 XY45',
  dob: '1990-04-03',
  custom: [{ key: 'PPS number', value: '1234567T' }],
};

describe('autofillPlan', () => {
  it('maps fields to stored values and skips filled ones', () => {
    const plan = autofillPlan(
      [
        field('a', 'Surname', 'surname'),
        field('b', 'Postcode', 'postcode'),
        field('c', 'Forename(s)', 'firstName'),
        field('d', 'Email', 'email'),
        field('e', 'Agree', null, 'tick'),
      ],
      [],
      details,
      new Set(['c']),
    );
    expect(plan).toEqual([
      { fieldId: 'a', label: 'Surname', value: 'Doe' },
      { fieldId: 'b', label: 'Postcode', value: 'D02 XY45' },
    ]);
  });

  it('formats the date of birth for the field', () => {
    expect(formatDob('1990-04-03', 'Date of birth')).toBe('03/04/1990');
    expect(formatDob('1990-04-03', 'Date of birth (MM/DD/YYYY)')).toBe(
      '04/03/1990',
    );
    const [row] = autofillPlan(
      [field('a', 'Date of birth', 'dob', 'date')],
      [],
      details,
      new Set(),
    );
    expect(row.value).toBe('03/04/1990');
  });

  it('matches custom details by label and AcroForm text fields by name', () => {
    const widgets: FormWidget[] = [
      {
        fieldName: 'surname',
        kind: 'text',
        pageIndex: 0,
        rect: { x: 0, y: 0, width: 10, height: 10 },
        readOnly: false,
      },
    ];
    const plan = autofillPlan(
      [field('p', 'PPS number', null)],
      widgets,
      details,
      new Set(),
    );
    expect(plan).toEqual([
      { fieldId: 'p', label: 'PPS number', value: '1234567T' },
      { fieldId: widgetFieldId('surname'), label: 'surname', value: 'Doe' },
    ]);
  });
});

describe('My details store', () => {
  it('saves, loads and clears in the profile store', async () => {
    const db = await openIdb({
      name: `profile-test-${Math.random()}`,
      version: 1,
      stores: ['profile'],
    });
    expect(await loadMyDetails(db)).toBeNull();
    await saveMyDetails(db, {
      ...details,
      custom: [...details.custom, { key: ' ', value: 'dropped' }],
    });
    expect(await loadMyDetails(db)).toEqual(details);
    await clearMyDetails(db);
    expect(await loadMyDetails(db)).toBeNull();
    db.close();
  });
});
