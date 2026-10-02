import { useRef } from 'react';
import {
  IconCheck,
  IconFieldDate,
  IconFieldSignature,
  IconFieldText,
  IconFieldTick,
  IconTrash,
} from '@/shared/ui/icons';
import { Button, Divider, Popover, Text } from '@/shared/ui';
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

const TYPES: { type: FieldType; label: string; icon: typeof IconFieldText }[] =
  [
    { type: 'text', label: 'Text', icon: IconFieldText },
    { type: 'multiline', label: 'Multiline', icon: IconFieldText },
    { type: 'tick', label: 'Tick', icon: IconFieldTick },
    { type: 'date', label: 'Date', icon: IconFieldDate },
    { type: 'signature', label: 'Signature', icon: IconFieldSignature },
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
  const first = useRef<HTMLButtonElement>(null);
  const close = () => fillSign.set({ menuFor: null });
  const run = (fn: () => unknown) => () => {
    fn();
    close();
  };
  const next = mergeCandidate(fields, field);
  return (
    <Popover
      open
      onOpenChange={(o) => !o && close()}
      anchor={anchor}
      side="bottom"
      align="start"
      label="Field options"
      modal
      initialFocus={first}
    >
      <div className="flex min-w-48 flex-col gap-1 p-1">
        <Button
          ref={first}
          size="sm"
          variant="ghost"
          leftIcon={<IconTrash size="sm" />}
          className="justify-start"
          onClick={run(() => dismissField(ctx, field))}
        >
          Not a field
        </Button>
        {field.status === 'suggested' ? (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconCheck size="sm" />}
            className="justify-start"
            onClick={run(() => acceptField(ctx, field))}
          >
            Accept suggestion
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          onClick={run(() => fillSign.set({ resizing: field.key }))}
        >
          Resize
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          onClick={run(() => splitField(ctx, field))}
        >
          Split
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          disabled={!next}
          onClick={run(() => next && mergeFields(ctx, field, next))}
        >
          Merge with next
        </Button>
        <Divider />
        <Text size="xs" tone="subtle" className="px-2">
          Change type
        </Text>
        {TYPES.map((t) => (
          <Button
            key={t.type}
            size="sm"
            variant="ghost"
            className="justify-start"
            leftIcon={<t.icon size="sm" />}
            aria-pressed={field.type === t.type}
            onClick={run(() => retypeField(ctx, field, t.type))}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </Popover>
  );
}
