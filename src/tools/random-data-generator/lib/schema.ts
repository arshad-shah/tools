import { newId } from '@/shared/lib/id';
import type { FieldSchema } from '../types';

// Give every field (at any depth) a stable id the editor can key cards and
// expand state by, so renaming a field never remounts or collapses it.
export const withIds = (schema: FieldSchema[]): FieldSchema[] =>
  schema.map((field) => ({
    ...field,
    id: field.id ?? newId(),
    ...(field.fields ? { fields: withIds(field.fields) } : {}),
  }));

// Resolve one path segment: a numeric index, else a field name. -1 if absent.
const resolveIndex = (fields: FieldSchema[], part: string): number => {
  if (/^\d+$/.test(part)) {
    const index = parseInt(part);
    return index < fields.length ? index : -1;
  }
  return fields.findIndex((f) => f.name === part);
};

// How far to advance after a segment: an index path steps over the "fields"
// key ("3.fields.1"), a name path does not ("address.city").
const nextStep = (parts: string[], currentIndex: number): number =>
  parts[currentIndex + 1] === 'fields' && currentIndex + 2 < parts.length
    ? 2
    : 1;

// Schema manipulation functions

// Add field to schema (handles nested fields)
export const addField = (
  schema: FieldSchema[],
  parentPath: string = '',
): FieldSchema[] => {
  if (!parentPath) {
    // Add to root level
    return [
      ...schema,
      {
        id: newId(),
        name: `field${schema.length + 1}`,
        type: 'string',
        required: false,
      },
    ];
  }

  // Find the parent field and add a nested field
  const newSchema = structuredClone(schema);
  const pathParts = parentPath.split('.');

  // Function to recursively find and update the target field
  const updateNestedField = (
    fields: FieldSchema[],
    parts: string[],
    currentIndex: number,
  ): void => {
    if (currentIndex >= parts.length) return;

    // An index ("1", "1.fields.0") from the editor, or a name ("address").
    const fieldIndex = resolveIndex(fields, parts[currentIndex]);

    if (fieldIndex === -1) return;

    if (currentIndex === parts.length - 1) {
      // We've found the parent, add a new field to its fields array
      const fieldsArray = fields[fieldIndex].fields || [];
      fields[fieldIndex].fields = [
        ...fieldsArray,
        {
          id: newId(),
          name: `field${fieldsArray.length + 1}`,
          type: 'string',
          required: false,
        },
      ];
    } else {
      // Continue traversing the path
      if (fields[fieldIndex].fields) {
        updateNestedField(
          fields[fieldIndex].fields,
          parts,
          currentIndex + nextStep(parts, currentIndex),
        );
      }
    }
  };

  updateNestedField(newSchema, pathParts, 0);
  return newSchema;
};

// Fixed removeField function for nested data
export const removeField = (
  schema: FieldSchema[],
  path: string,
): FieldSchema[] => {
  // Simple case: top-level field
  if (!path.includes('.')) {
    const index = parseInt(path);
    return schema.filter((_, i) => i !== index);
  }

  // For nested fields, we need to handle the path correctly
  const newSchema = structuredClone(schema);
  const pathParts = path.split('.');

  // Helper function to recursively navigate the schema and remove the field
  const removeFieldByPath = (
    fields: FieldSchema[],
    pathSegments: string[],
    currentIndex: number,
  ): void => {
    // If we've reached the parent of the field to remove
    if (currentIndex === pathSegments.length - 1) {
      const lastSegment = pathSegments[currentIndex];

      // Check if it's a numeric index or a field name
      if (/^\d+$/.test(lastSegment)) {
        // It's an index, so we can directly splice
        const indexToRemove = parseInt(lastSegment);
        if (indexToRemove >= 0 && indexToRemove < fields.length) {
          fields.splice(indexToRemove, 1);
        }
      } else {
        // It's a field name, so we find the index by name
        const fieldIndex = fields.findIndex((f) => f.name === lastSegment);
        if (fieldIndex !== -1) {
          fields.splice(fieldIndex, 1);
        }
      }
      return;
    }

    // If we're still navigating the path
    const segment = pathSegments[currentIndex];
    let nextFields: FieldSchema[] | undefined;
    let nextIndex: number;

    // Handle numeric segments (direct array indices)
    if (/^\d+$/.test(segment)) {
      nextIndex = parseInt(segment);
      if (nextIndex >= 0 && nextIndex < fields.length) {
        nextFields = fields[nextIndex].fields;
      }
    }
    // Handle field name segments
    else {
      nextIndex = fields.findIndex((f) => f.name === segment);
      if (nextIndex !== -1) {
        nextFields = fields[nextIndex].fields;
      }
    }

    // Special handling for when the next segment is "fields"
    const isNextSegmentFields = pathSegments[currentIndex + 1] === 'fields';

    if (isNextSegmentFields) {
      // Skip the "fields" segment and continue with the next one
      const nestedFields = fields[nextIndex].fields;
      if (nextIndex !== -1 && nestedFields && Array.isArray(nestedFields)) {
        removeFieldByPath(nestedFields, pathSegments, currentIndex + 2);
      }
    } else if (nextIndex !== -1 && nextFields) {
      // Continue with normal path traversal
      removeFieldByPath(nextFields, pathSegments, currentIndex + 1);
    }
  };

  // Start the recursive removal process
  removeFieldByPath(newSchema, pathParts, 0);

  return newSchema;
};

// Update field in schema (handles nested fields)
export const updateField = (
  schema: FieldSchema[],
  path: string,
  updatedField: Partial<FieldSchema>,
): FieldSchema[] => {
  if (!path.includes('.')) {
    // Simple case: top-level field
    const index = parseInt(path);
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...updatedField };
    return newSchema;
  }

  // Nested case
  const pathParts = path.split('.');
  const newSchema = structuredClone(schema);

  // Function to recursively find and update the target field
  const updateNestedField = (
    fields: FieldSchema[],
    parts: string[],
    currentIndex: number,
  ): void => {
    if (currentIndex >= parts.length) return;

    const index = resolveIndex(fields, parts[currentIndex]);
    if (index === -1) return;

    if (currentIndex === parts.length - 1) {
      // We've reached the target field
      fields[index] = { ...fields[index], ...updatedField };
      return;
    }

    // Continue traversing the path
    const nestedFields = fields[index].fields;
    if (nestedFields) {
      updateNestedField(
        nestedFields,
        parts,
        currentIndex + nextStep(parts, currentIndex),
      );
    }
  };

  updateNestedField(newSchema, pathParts, 0);
  return newSchema;
};

// Move field up or down in the schema
export const moveField = (
  schema: FieldSchema[],
  path: string,
  direction: 'up' | 'down',
): FieldSchema[] => {
  if (!path.includes('.')) {
    // Simple case: top-level field
    const index = parseInt(path);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === schema.length - 1)
    ) {
      return schema; // Can't move further
    }

    const newSchema = [...schema];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSchema[index], newSchema[targetIndex]] = [
      newSchema[targetIndex],
      newSchema[index],
    ];
    return newSchema;
  }

  // For nested fields, clone and update
  const pathParts = path.split('.');
  const newSchema = structuredClone(schema);

  // Function to recursively find and move the target field
  const moveNestedField = (
    fields: FieldSchema[],
    parts: string[],
    currentIndex: number,
  ): void => {
    if (currentIndex >= parts.length - 1) {
      // We've reached the parent container, move the child field
      const fieldIndex = parseInt(parts[parts.length - 1]);

      if (
        (direction === 'up' && fieldIndex === 0) ||
        (direction === 'down' && fieldIndex === fields.length - 1)
      ) {
        return; // Can't move further
      }

      const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
      [fields[fieldIndex], fields[targetIndex]] = [
        fields[targetIndex],
        fields[fieldIndex],
      ];
      return;
    }

    const fieldIndex = resolveIndex(fields, parts[currentIndex]);

    if (fieldIndex === -1) return;

    const nestedFields = fields[fieldIndex].fields;
    if (nestedFields) {
      moveNestedField(
        nestedFields,
        parts,
        currentIndex + nextStep(parts, currentIndex),
      );
    }
  };

  moveNestedField(newSchema, pathParts, 0);
  return newSchema;
};
