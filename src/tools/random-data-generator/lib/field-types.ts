import { MOCK_FIELD_TYPES } from '@/shared/lib/data-formats/mock-schema';
import type { FieldSchema, FieldType } from '../types';
import { FIELD_TYPE_INFO } from './generators/labels';

/** Every field type, in picker order. */
export const fieldTypes: FieldType[] = MOCK_FIELD_TYPES.map((value) => ({
  value,
  label: FIELD_TYPE_INFO[value].label,
}));

/** Help text per field type. */
export const fieldDescriptions: Record<string, string> = Object.fromEntries(
  MOCK_FIELD_TYPES.map((t) => [t, FIELD_TYPE_INFO[t].description]),
);

// Default schema to initialize the generator
export const defaultSchema: FieldSchema[] = [
  { name: 'id', type: 'uuid', required: true },
  { name: 'name', type: 'fullName', required: true },
  { name: 'email', type: 'email', required: true },
  {
    name: 'address',
    type: 'object',
    required: true,
    fields: [
      { name: 'street', type: 'address', required: true },
      { name: 'city', type: 'city', required: true },
      { name: 'zipCode', type: 'zipCode', required: true },
      { name: 'country', type: 'country', required: true },
    ],
  },
];
