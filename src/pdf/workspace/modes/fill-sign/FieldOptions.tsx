import {
  check,
  fieldDate,
  fieldSignature,
  fieldText,
  fieldTick,
  trash,
} from '@arshad-shah/cynosure/icons';
import { ContextMenu } from '@arshad-shah/cynosure';
import type { FieldType } from '@/pdf/detect';
import type { ModeProps } from '../types';
import {
  acceptField,
  dismissField,
  mergeCandidate,
  mergeFields,
  retypeField,
  splitField,
} from './actions';
import type { ViewField } from './fields';
import { fillSign } from './store';

const TYPES: { type: FieldType; label: string; icon: typeof fieldText }[] = [
  { type: 'text', label: 'Text', icon: fieldText },
  { type: 'multiline', label: 'Multiline', icon: fieldText },
  { type: 'tick', label: 'Tick', icon: fieldTick },
  { type: 'date', label: 'Date', icon: fieldDate },
  { type: 'signature', label: 'Signature', icon: fieldSignature },
];

/**
 * Corrections of one detected field (spec §8.5): not a field, accept, change
 * type, split, merge with the next field, resize. Each is one undo step.
 */
export function FieldOptions({
  ctx,
  field,
  fields,
  anchor,
}: {
  ctx: ModeProps;
  field: ViewField;
  fields: readonly ViewField[];
  anchor: { getBoundingClientRect(): DOMRect };
}) {
  const close = () => fillSign.set({ menuFor: null });
  const next = mergeCandidate(fields, field);
  const actions: Record<string, () => unknown> = {
    dismiss: () => dismissField(ctx, field),
    accept: () => acceptField(ctx, field),
    resize: () => fillSign.set({ resizing: field.key }),
    split: () => splitField(ctx, field),
    merge: () => next && mergeFields(ctx, field, next),
  };
  return (
    <ContextMenu
      open
      anchor={anchor}
      onOpenChange={(o) => !o && close()}
      label="Field options"
      items={[
        {
          items: [
            { value: 'dismiss', label: 'Not a field', icon: trash },
            ...(field.status === 'suggested'
              ? [{ value: 'accept', label: 'Accept suggestion', icon: check }]
              : []),
            { value: 'resize', label: 'Resize' },
            { value: 'split', label: 'Split' },
            { value: 'merge', label: 'Merge with next', disabled: !next },
          ],
        },
        {
          label: 'Change type',
          items: TYPES.map((t) => ({
            value: `type:${t.type}`,
            label: t.label,
            icon: t.icon,
            kind: 'radio' as const,
            checked: field.type === t.type,
          })),
        },
      ]}
      onSelect={(value) => {
        if (value.startsWith('type:'))
          retypeField(ctx, field, value.slice(5) as FieldType);
        else actions[value]?.();
        close();
      }}
    />
  );
}
