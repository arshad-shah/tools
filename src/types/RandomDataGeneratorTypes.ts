/* eslint-disable @typescript-eslint/no-explicit-any */
// types.ts
export interface FieldSchema {
  name: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  arraySize?: number;
  fields?: FieldSchema[];
}

export interface GeneratedDataItem {
  [key: string]: any;
}

export interface FlattenedDataItem {
  [key: string]: string | number | boolean | null;
}