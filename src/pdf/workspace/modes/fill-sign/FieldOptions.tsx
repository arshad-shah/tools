import {
  check,
  fieldDate,
  fieldSignature,
  fieldText,
  fieldTick,
  trash,
} from '@arshad-shah/cynosure/icons';
import { Button, Divider, Popover, Stack, Text } from '@arshad-shah/cynosure';
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
  const run = (fn: () => unknown) => () => {
    fn();
    close();
  };
  const next = mergeCandidate(fields, field);
  const item = (
    label: string,
    act: () => unknown,
    extra: {
      icon?: typeof fieldText;
      disabled?: boolean;
      pressed?: boolean;
    } = {},
  ) => (
    <Button
      key={label}
      size="sm"
      variant={extra.pressed ? 'soft' : 'ghost'}
      tone={extra.pressed ? 'accent' : 'neutral'}
      icon={extra.icon}
      fullWidth
      disabled={extra.disabled}
      pressed={extra.pressed}
      onClick={run(act)}
    >
      {label}
    </Button>
  );
  // Cynosure has no menu opened at a point in 0.6.0 (docs/cynosure-gaps.md):
  // the corrections are a Popover of buttons at the field.
  return (
    <Popover
      open
      onOpenChange={(o) => !o && close()}
      anchor={anchor}
      placement="bottom"
      label="Field options"
      modal
      initialFocus="first"
      size="sm"
    >
      <Stack gap="1">
        {item('Not a field', () => dismissField(ctx, field), { icon: trash })}
        {field.status === 'suggested'
          ? item('Accept suggestion', () => acceptField(ctx, field), {
              icon: check,
            })
          : null}
        {item('Resize', () => fillSign.set({ resizing: field.key }))}
        {item('Split', () => splitField(ctx, field))}
        {item('Merge with next', () => next && mergeFields(ctx, field, next), {
          disabled: !next,
        })}
        <Divider spacing="sm" />
        <Text size="xs" tone="muted">
          Change type
        </Text>
        {TYPES.map((t) =>
          item(t.label, () => retypeField(ctx, field, t.type), {
            icon: t.icon,
            pressed: field.type === t.type,
          }),
        )}
      </Stack>
    </Popover>
  );
}
