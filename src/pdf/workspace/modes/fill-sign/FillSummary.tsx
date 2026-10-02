import { IconFieldText, IconNextField } from '@/shared/ui/icons';
import {
  Button,
  EmptyState,
  InspectorSection,
  MetaList,
  Progress,
  Stack,
  Text,
} from '@/shared/ui';
import type { ModeProps } from '../types';
import { addTextAtCentre, advance } from './actions';
import { useViewFields } from './data';
import { fillSign, useFillSign } from './store';

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The inspector with nothing selected: how far the form is filled, the
 * signatures placed and the next thing to do.
 */
export function FillSummary(ctx: ModeProps) {
  const { doc } = ctx;
  const fields = useViewFields(doc);
  const progress = useFillSign((s) => s.progress);
  const real = fields.filter((f) => f.status === 'field');
  const filled = real.filter((f) => f.filled).length;
  const left = real.length - filled;
  const suggested = fields.length - real.length;
  const signatures = [...doc.view.overlays.values()]
    .flat()
    .filter(
      (o) => o.type === 'sign.place' && !doc.view.hidden.has(o.opId),
    ).length;

  if (real.length === 0)
    return (
      <InspectorSection title="Form">
        <EmptyState
          icon={IconFieldText}
          headingLevel={4}
          title="No fields found yet"
          description={
            progress
              ? `Detecting fields, page ${progress.done + 1} of ${progress.total}.`
              : 'Click anywhere on the page to type, or add a text box.'
          }
          actions={
            <Button
              size="sm"
              leftIcon={<IconFieldText size="sm" />}
              onClick={() => addTextAtCentre(ctx)}
            >
              Add text box
            </Button>
          }
          className="m-3 py-6"
        />
      </InspectorSection>
    );

  return (
    <InspectorSection title="Form">
      <Stack gap="2" className="p-3">
        <Text size="sm">{`${filled} of ${plural(real.length, 'field', 'fields')} filled`}</Text>
        <Progress value={filled} max={real.length} label="Fields filled" />
        <MetaList
          items={[
            `${left} left`,
            plural(signatures, 'signature placed', 'signatures placed'),
            ...(suggested
              ? [plural(suggested, 'suggestion', 'suggestions')]
              : []),
          ]}
        />
        {left > 0 ? (
          <Button
            size="sm"
            leftIcon={<IconNextField size="sm" />}
            onClick={() => advance(ctx, fields, fillSign.get().focusKey)}
          >
            Next empty field
          </Button>
        ) : (
          <Text size="sm" tone="muted">
            Every field is filled
          </Text>
        )}
      </Stack>
    </InspectorSection>
  );
}
