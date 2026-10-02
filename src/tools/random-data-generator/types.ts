import type { MockField } from '@/shared/lib/data-formats/mock-schema';

/** One editor field: the shared mock-schema field (spec §8.2). */
export type FieldSchema = MockField;

export type GeneratedValue =
  | string
  | number
  | boolean
  | object
  | null
  | undefined;

export interface GeneratedDataItem {
  [key: string]: GeneratedValue;
}

/** One generated item with nested objects flattened to dotted keys. */
export type FlattenedRow = Record<string, unknown>;

export interface FieldType {
  value: string;
  label: string;
}
