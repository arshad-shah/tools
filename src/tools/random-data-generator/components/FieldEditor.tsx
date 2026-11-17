import {
  Badge,
  Button,
  Card,
  IconButton,
  Inline,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import {
  arrowDown,
  arrowUp,
  chevronDown,
  chevronRight,
  plus,
  trash,
} from '@arshad-shah/cynosure/icons';
import type { MockTable } from '@/shared/lib/data-formats/mock-schema';
import { fieldDescriptions, fieldTypes } from '../lib/field-types';
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

const TYPE_OPTIONS = fieldTypes.map((t) => ({
  value: t.value,
  label: t.label,
}));

/** One field: name, type, options; objects and arrays hold more fields. */
export function FieldEditor({
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
}: FieldEditorProps) {
  const isNested = field.type === 'object' || field.type === 'array';
  const fullPath = parentPath ? `${parentPath}.${index}` : `${index}`;
  // Expand state is keyed by the stable id so a rename keeps it open.
  const expandKey = field.id ?? fullPath;
  const isExpanded = expandedFields[expandKey] || false;

  return (
    <Card padding="sm" variant={level > 0 ? 'outline' : undefined}>
      <Stack gap="3">
        <Inline justify="between" align="center" gap="2" wrap={false}>
          <Inline align="center" gap="2" wrap={false}>
            {isNested ? (
              <IconButton
                variant="ghost"
                size="sm"
                label={isExpanded ? 'Collapse field' : 'Expand field'}
                aria-expanded={isExpanded}
                icon={isExpanded ? chevronDown : chevronRight}
                onClick={() => onToggleExpanded(expandKey)}
              />
            ) : null}
            <Badge variant="soft" tone="accent" size="sm">
              {`#${index + 1}`}
            </Badge>
          </Inline>
          <Inline gap="1" wrap={false}>
            {level === 0 && (
              <>
                <IconButton
                  variant="ghost"
                  size="sm"
                  label="Move up"
                  icon={arrowUp}
                  disabled={index === 0}
                  onClick={() => onMoveField(`${index}`, 'up')}
                />
                <IconButton
                  variant="ghost"
                  size="sm"
                  label="Move down"
                  icon={arrowDown}
                  disabled={index === totalFields - 1}
                  onClick={() => onMoveField(`${index}`, 'down')}
                />
              </>
            )}
            <IconButton
              variant="ghost"
              tone="danger"
              size="sm"
              label="Remove field"
              icon={trash}
              onClick={() => onRemoveField(fullPath)}
            />
          </Inline>
        </Inline>
        <Inline gap="2" align="start" wrap>
          <Stack grow minSize="0">
            <TextField
              size="sm"
              label="Field name"
              labelHidden
              value={field.name}
              placeholder="Field name"
              onChange={(value) => onUpdateField(fullPath, { name: value })}
            />
          </Stack>
          <Select
            size="sm"
            label="Data type"
            labelHidden
            value={field.type}
            onChange={(v) =>
              onUpdateField(fullPath, { type: v as FieldSchema['type'] })
            }
            options={TYPE_OPTIONS}
          />
        </Inline>
        <FieldOptions
          field={field}
          tables={tables}
          onChange={(patch) => onUpdateField(fullPath, patch)}
        />
        <Text size="xs" tone="muted">
          {fieldDescriptions[field.type] ||
            'Field type description not available'}
        </Text>
        {isNested && isExpanded && (
          <Stack gap="3" paddingInline="3">
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
              variant="soft"
              size="sm"
              icon={plus}
              onClick={() => onAddField(fullPath)}
              fullWidth
            >
              {`Add field to ${field.name}`}
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
