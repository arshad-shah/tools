export interface FieldSchema {
  /** Stable identity for the editor (React keys, expand state); not part of the generated data. */
  id?: string;
  name: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  arraySize?: number;
  fields?: FieldSchema[];
}

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
