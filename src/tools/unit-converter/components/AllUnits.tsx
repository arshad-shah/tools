import React from 'react';
import {
  IconCheck,
  IconCopy,
  IconStar,
  IconStarFilled,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  IconButton,
  Input,
  Label,
  Stack,
  Text,
} from '@/shared/ui';
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
  copiedKey: string | null;
  onCopy: (unit: string, text: string) => void;
}

/**
 * Every unit of the category as an editable row (spec §8.5): typing in
 * any row converts to all the others. Pinned units come first.
 */
export const AllUnits: React.FC<AllUnitsProps> = ({
  category,
  values,
  editing,
  invalid,
  onEdit,
  pinned,
  onTogglePin,
  copiedKey,
  onCopy,
}) => {
  const units = [
    ...category.units.filter((u) => pinned.has(u.id)),
    ...category.units.filter((u) => !pinned.has(u.id)),
  ];
  return (
    <Stack gap="2" role="group" aria-label={`${category.label} units`}>
      {invalid && (
        <Alert status="danger">
          <AlertDescription id="unit-input-error">
            {`"${editing.text}" is not a number`}
          </AlertDescription>
        </Alert>
      )}
      {units.map((u) => {
        const id = `unit-${category.id}-${u.id}`;
        const isEditing = editing.unit === u.id;
        const text = isEditing ? editing.text : (values[u.id] ?? '');
        const isPinned = pinned.has(u.id);
        return (
          // Label above the value on phones, beside it from sm up.
          <div
            key={u.id}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto_auto]"
          >
            <Stack gap="0" className="col-span-3 sm:col-span-1">
              <Label htmlFor={id}>{u.label}</Label>
              <Text size="xs" tone="subtle">
                {u.note ? `${u.symbol}, ${u.note}` : u.symbol}
              </Text>
            </Stack>
            <Input
              id={id}
              value={text}
              inputMode="decimal"
              spellCheck={false}
              autoComplete="off"
              invalid={isEditing && invalid}
              aria-invalid={isEditing && invalid ? true : undefined}
              aria-describedby={
                isEditing && invalid ? 'unit-input-error' : undefined
              }
              onChange={(v) => onEdit(u.id, v)}
            />
            <IconButton
              variant="ghost"
              size="sm"
              label={
                copiedKey === u.id ? `Copied ${u.label}` : `Copy ${u.label}`
              }
              icon={
                copiedKey === u.id ? (
                  <IconCheck size="sm" />
                ) : (
                  <IconCopy size="sm" />
                )
              }
              disabled={!text}
              onClick={() => onCopy(u.id, `${text} ${u.symbol}`)}
            />
            <IconButton
              variant="ghost"
              size="sm"
              label={isPinned ? `Unpin ${u.label}` : `Pin ${u.label}`}
              aria-pressed={isPinned}
              icon={
                isPinned ? <IconStarFilled size="sm" /> : <IconStar size="sm" />
              }
              onClick={() => onTogglePin(u.id)}
            />
          </div>
        );
      })}
    </Stack>
  );
};
