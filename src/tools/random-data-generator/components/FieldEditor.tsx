import React from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash2,
} from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { fieldDescriptions, fieldTypes } from '../lib/field-types';
import type { MockTable } from '@/shared/lib/data-formats/mock-schema';
import type { FieldSchema } from '../types';
import { FieldOptions } from './FieldOptions';

interface FieldEditorProps {
  field: FieldSchema;

  index: number;
  parentPath: string;
  level: number;
  expandedFields: { [key: string]: boolean };
  totalFields: number;
  onRemoveField: (path: string) => void;
  onUpdateField: (path: string, updatedField: Partial<FieldSchema>) => void;
  onMoveField: (path: string, direction: 'up' | 'down') => void;
  onToggleExpanded: (path: string) => void;
  onAddField: (parentPath?: string) => void;
  /** Every table of the schema (reference fields pick from them). */
  tables: readonly MockTable[];
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,

  index,
  parentPath,
  level,
  expandedFields,
  totalFields,
  onRemoveField,
  onUpdateField,
  onMoveField,
  onToggleExpanded,
  onAddField,
  tables,
}) => {
  const isObject = field.type === 'object';
  const isArray = field.type === 'array';
  const isNested = isObject || isArray;
  const fullPath = parentPath ? `${parentPath}.${index}` : `${index}`;
  // Expand state is keyed by the stable id so a rename keeps it open.
  const expandKey = field.id ?? fullPath;
  const isExpanded = expandedFields[expandKey] || false;

  return (
    <Card>
      <CardBody>
        <Stack gap="3">
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2" wrap>
              {isNested && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={isExpanded ? 'Collapse field' : 'Expand field'}
                  icon={
                    isExpanded ? (
                      <IconChevronDown size="sm" />
                    ) : (
                      <IconChevronRight size="sm" />
                    )
                  }
                  onClick={() => onToggleExpanded(expandKey)}
                />
              )}
              <Badge variant="soft" tone="accent" size="sm">
                #{index + 1}
              </Badge>
              <Box className="min-w-0">
                <Input
                  value={field.name}
                  onChange={(value) => onUpdateField(fullPath, { name: value })}
                  placeholder="Field name"
                  aria-label="Field name"
                />
              </Box>
            </Inline>
            <Inline gap="1">
              {level === 0 && (
                <>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Move up"
                    icon={<IconArrowUp size="sm" />}
                    disabled={index === 0}
                    onClick={() => onMoveField(`${index}`, 'up')}
                  />
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Move down"
                    icon={<IconArrowDown size="sm" />}
                    disabled={index === totalFields - 1}
                    onClick={() => onMoveField(`${index}`, 'down')}
                  />
                </>
              )}
              <IconButton
                variant="danger"
                size="sm"
                label="Remove field"
                icon={<IconTrash2 size="sm" />}
                onClick={() => onRemoveField(fullPath)}
              />
            </Inline>
          </Inline>

          <Grid max={2} gap="3">
            <Stack gap="2">
              <Label>Data type</Label>
              <Select
                value={field.type}
                onValueChange={(v) =>
                  onUpdateField(fullPath, { type: v as FieldSchema['type'] })
                }
                items={fieldTypes.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                aria-label="Data type"
              />
            </Stack>
          </Grid>
          <FieldOptions
            field={field}
            tables={tables}
            onChange={(patch) => onUpdateField(fullPath, patch)}
          />

          <Text size="xs" tone="subtle" className="italic">
            {fieldDescriptions[field.type] ||
              'Field type description not available'}
          </Text>

          {isNested && isExpanded && (
            <Stack gap="3" className="pl-4">
              {field.fields?.map((nestedField, nestedIndex) => (
                <FieldEditor
                  key={nestedField.id ?? nestedIndex}
                  field={nestedField}
                  index={nestedIndex}
                  parentPath={`${fullPath}.fields`}
                  level={level + 1}
                  expandedFields={expandedFields}
                  totalFields={field.fields?.length ?? 0}
                  onRemoveField={onRemoveField}
                  onUpdateField={onUpdateField}
                  onMoveField={onMoveField}
                  onToggleExpanded={onToggleExpanded}
                  onAddField={onAddField}
                  tables={tables}
                />
              ))}
              <Button
                variant="secondary"
                leftIcon={<IconPlus size="sm" />}
                onClick={() => onAddField(fullPath)}
                fullWidth
              >
                Add field to {field.name}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
