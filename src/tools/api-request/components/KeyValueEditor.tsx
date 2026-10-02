import React from 'react';
import { IconPlus, IconTrash2 } from '@/shared/ui/icons';

import {
  Box,
  Button,
  IconButton,
  Inline,
  Input,
  Stack,
  Switch,
} from '@/shared/ui';

export interface KeyValueRow {
  key: string;
  value: string;
  enabled?: boolean;
}

interface KeyValueEditorProps {
  rows: readonly KeyValueRow[];
  keyPlaceholder: string;
  removeLabel: string;
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: 'key' | 'value', value: string) => void;
  /** Shows the per-row "Enabled" switch when given. */
  onToggle?: (index: number, enabled: boolean) => void;
}

/** Key/value rows for the request params and headers tabs. */
export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  rows,
  keyPlaceholder,
  removeLabel,
  addLabel,
  onAdd,
  onRemove,
  onChange,
  onToggle,
}) => (
  <Stack gap="2">
    {rows.map((row, idx) => (
      <Inline key={idx} gap="2" align="center" wrap>
        {onToggle && (
          <Switch
            checked={Boolean(row.enabled)}
            onCheckedChange={(c) => onToggle(idx, c)}
            aria-label="Enabled"
          />
        )}
        <Box className="min-w-0 flex-1">
          <Input
            value={row.key}
            onChange={(v) => onChange(idx, 'key', v)}
            placeholder={keyPlaceholder}
          />
        </Box>
        <Box className="min-w-0 flex-1">
          <Input
            value={row.value}
            onChange={(v) => onChange(idx, 'value', v)}
            placeholder="Value"
          />
        </Box>
        <IconButton
          variant="ghost"
          size="sm"
          label={removeLabel}
          icon={<IconTrash2 size="sm" />}
          onClick={() => onRemove(idx)}
        />
      </Inline>
    ))}
    <Button
      variant="secondary"
      size="sm"
      leftIcon={<IconPlus size="sm" />}
      onClick={onAdd}
    >
      {addLabel}
    </Button>
  </Stack>
);
