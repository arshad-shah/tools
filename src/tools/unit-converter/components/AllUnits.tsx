import {
  CopyButton,
  IconButton,
  Inline,
  Notice,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { star } from '@arshad-shah/cynosure/icons';
import React from 'react';
import type { Category } from '../lib/units';

export interface AllUnitsProps {
  category: Category;
  /** Display text per unit id ('' when there is no value). */
  values: Record<string, string>;
  /** The row being typed in keeps the user's own text. */
  editing: { unit: string; text: string };
  invalid: boolean;
  onEdit: (unit: string, text: string) => void;
  pinned: Set<string>;
  onTogglePin: (unit: string) => void;
}

/**
 * Every unit of the category as an editable row: typing in any row
 * converts to all the others. Pinned units come first.
 */
export const AllUnits: React.FC<AllUnitsProps> = ({
  category,
  values,
  editing,
  invalid,
  onEdit,
  pinned,
  onTogglePin,
}) => {
  const units = [
    ...category.units.filter((u) => pinned.has(u.id)),
    ...category.units.filter((u) => !pinned.has(u.id)),
  ];
  return (
    <Stack gap="4" role="group" aria-label={`${category.label} units`}>
      {invalid ? (
        <Notice tone="danger" size="sm">
          {`"${editing.text}" is not a number`}
        </Notice>
      ) : null}
      {units.map((u) => {
        const isEditing = editing.unit === u.id;
        const text = isEditing ? editing.text : (values[u.id] ?? '');
        const isPinned = pinned.has(u.id);
        return (
          <Inline key={u.id} gap="2" align="end">
            <Stack grow minSize="0">
              <TextField
                label={u.label}
                description={u.note ? `${u.symbol}, ${u.note}` : u.symbol}
                layout="split"
                width="full"
                value={text}
                inputMode="decimal"
                spellCheck={false}
                autoComplete="off"
                error={isEditing && invalid ? 'Not a number' : undefined}
                onChange={(v) => onEdit(u.id, v)}
                addonEnd={
                  <CopyButton
                    size="sm"
                    disabled={!text}
                    value={() => `${text} ${u.symbol}`}
                    labels={{ copy: `Copy ${u.label}` }}
                  />
                }
              />
            </Stack>
            <IconButton
              size="sm"
              variant={isPinned ? 'soft' : 'ghost'}
              tone={isPinned ? 'accent' : 'neutral'}
              icon={star}
              label={isPinned ? `Unpin ${u.label}` : `Pin ${u.label}`}
              aria-pressed={isPinned}
              onClick={() => onTogglePin(u.id)}
            />
          </Inline>
        );
      })}
    </Stack>
  );
};
