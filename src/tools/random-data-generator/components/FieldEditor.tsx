import {
  Badge,
  Button,
  Card,
  IconButton,
  Inline,
  Menu,
  Popover,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import {
  chevronDown,
  chevronRight,
  moreHorizontal,
  plus,
  sliders,
} from '@arshad-shah/cynosure/icons';
import type { MockTable } from '@/shared/lib/data-formats/mock-schema';
import { fieldDescriptions, fieldTypes } from '../lib/field-types';
import { changedOptions } from '../lib/options';
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

/**
 * One field on one row: name, type, its options behind a popover and the
 * move and remove actions in a menu. Objects and arrays hold more fields.
 */
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
  // A plain object has no options of its own.
  const hasOptions = field.type !== 'object';
  const changed = changedOptions(field);

  return (
    <Card padding="sm" variant={level > 0 ? 'outline' : undefined}>
      <Stack gap="3">
        <Inline gap="2" align="center" wrap>
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
          <Inline gap="2" align="center" wrap={false}>
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
            {hasOptions ? (
              <Popover
                label={`Options for ${field.name || 'this field'}`}
                size="lg"
                width="fixed"
                trigger={(props) => (
                  <Button {...props} size="sm" variant="ghost" icon={sliders}>
                    Options
                    {changed ? (
                      <Badge size="sm" tone="accent">
                        {String(changed)}
                      </Badge>
                    ) : null}
                  </Button>
                )}
              >
                <Stack gap="3">
                  <Text size="sm" tone="muted">
                    {fieldDescriptions[field.type] ??
                      'Field type description not available'}
                  </Text>
                  <FieldOptions
                    field={field}
                    tables={tables}
                    onChange={(patch) => onUpdateField(fullPath, patch)}
                  />
                </Stack>
              </Popover>
            ) : null}
            <Menu
              label={`Actions for ${field.name || 'this field'}`}
              items={[
                ...(level === 0
                  ? [
                      {
                        value: 'up',
                        label: 'Move up',
                        disabled: index === 0,
                      },
                      {
                        value: 'down',
                        label: 'Move down',
                        disabled: index === totalFields - 1,
                      },
                    ]
                  : []),
                {
                  value: 'remove',
                  label: 'Remove field',
                  tone: 'danger' as const,
                },
              ]}
              onSelect={(v) =>
                v === 'remove'
                  ? onRemoveField(fullPath)
                  : onMoveField(`${index}`, v as 'up' | 'down')
              }
              trigger={(props) => (
                <IconButton
                  {...props}
                  size="sm"
                  variant="ghost"
                  label="Field actions"
                  icon={moreHorizontal}
                />
              )}
            />
          </Inline>
        </Inline>
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
