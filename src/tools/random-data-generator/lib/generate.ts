import { parseMockSchema } from '@/shared/lib/data-formats/mock-schema';
import type { FieldSchema, FlattenedRow, GeneratedDataItem } from '../types';
import { generateMock } from './engine';

/**
 * `count` items for one list of fields (the editor's single table). A seed
 * makes the output repeatable; without one the values come from
 * crypto.getRandomValues. Unknown field types give INVALID_INPUT.
 */
export const generateData = (
  schema: FieldSchema[],
  count: number,
  seed: string | null = null,
): GeneratedDataItem[] =>
  generateMock(
    parseMockSchema({ tables: [{ name: 'rows', fields: schema }] }),
    {
      count,
      seed,
      locale: 'en-US',
    },
  ).rows as GeneratedDataItem[];

// Flatten nested data for table display
export const flattenData = (data: GeneratedDataItem[]): FlattenedRow[] => {
  if (!data || data.length === 0) return [];

  // Function to flatten a single nested object
  const flattenObject = (
    obj: Record<string, unknown>,
    prefix = '',
  ): FlattenedRow => {
    return Object.keys(obj).reduce((acc: FlattenedRow, key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        // Recursively flatten nested objects
        Object.assign(
          acc,
          flattenObject(obj[key] as Record<string, unknown>, prefixedKey),
        );
      } else if (Array.isArray(obj[key])) {
        // For arrays, add a stringified version for display
        acc[prefixedKey] = JSON.stringify(obj[key]);
      } else {
        // For primitive values, just add them with the prefixed key
        acc[prefixedKey] = obj[key];
      }

      return acc;
    }, {});
  };

  // Map through data and flatten each item
  return data.map((item) => flattenObject(item));
};

// Get all column headers from flattened data
export const getAllHeaders = (data: FlattenedRow[]): string[] => {
  if (!data || data.length === 0) return [];
  const headerSet = new Set<string>();

  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      headerSet.add(key);
    });
  });

  return Array.from(headerSet);
};

// Export data as JSON for download
export const dataToJsonBlob = (data: GeneratedDataItem[]): Blob => {
  const dataStr = JSON.stringify(data, null, 2);
  return new Blob([dataStr], { type: 'application/json' });
};
