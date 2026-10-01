import { describe, expect, it } from 'vitest';
import type { FormField } from '@/pdf/edit';
import { changedValues, initialValues } from './values';

const fields: FormField[] = [
  {
    kind: 'text',
    name: 'name',
    label: null,
    value: 'Ada',
    multiline: false,
    maxLength: null,
    readOnly: false,
  },
  {
    kind: 'checkbox',
    name: 'agree',
    label: null,
    checked: false,
    readOnly: false,
  },
  {
    kind: 'radio',
    name: 'size',
    label: null,
    options: ['S', 'M'],
    selected: null,
    readOnly: false,
  },
  {
    kind: 'dropdown',
    name: 'country',
    label: null,
    options: ['IE', 'FR'],
    selected: ['IE'],
    multiSelect: false,
    editable: false,
    readOnly: false,
  },
  {
    kind: 'optionlist',
    name: 'toppings',
    label: null,
    options: ['Cheese', 'Olives'],
    selected: [],
    multiSelect: true,
    readOnly: false,
  },
  {
    kind: 'text',
    name: 'ref',
    label: null,
    value: 'R-1',
    multiline: false,
    maxLength: null,
    readOnly: true,
  },
  { kind: 'unsupported', name: 'sig', label: null, type: 'signature' },
];

describe('form values', () => {
  it('starts from the current field values', () => {
    expect(initialValues(fields)).toEqual({
      name: 'Ada',
      agree: false,
      size: '',
      country: 'IE',
      toppings: [],
      ref: 'R-1',
    });
  });
  it('sends only changed, writable fields', () => {
    const initial = initialValues(fields);
    expect(changedValues(fields, initial, initial)).toEqual({});
    expect(
      changedValues(
        fields,
        {
          ...initial,
          name: 'Ada',
          agree: true,
          toppings: ['Olives'],
          ref: 'changed',
        },
        initial,
      ),
    ).toEqual({ agree: true, toppings: ['Olives'] });
  });
});
