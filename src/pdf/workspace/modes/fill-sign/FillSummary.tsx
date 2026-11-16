import { type as typeIcon } from '@arshad-shah/cynosure/icons';
import { fieldNext, fieldText } from '@arshad-shah/cynosure/icons';
import {
  Button,
  EmptyState,
  Inline,
  ProgressBar,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { InspectorSection } from '../../ui/InspectorSection';
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
          icon={typeIcon}
          headingLevel={4}
          size="sm"
          title="No fields found yet"
          description={
            progress
              ? `Detecting fields, page ${progress.done + 1} of ${progress.total}.`
              : 'Click anywhere on the page to type, or add a text box.'
          }
          actions={
            <Button
              size="sm"
              icon={fieldText}
              onClick={() => addTextAtCentre(ctx)}
            >
              Add text box
            </Button>
          }
        />
      </InspectorSection>
    );

  return (
    <InspectorSection title="Form">
      <Stack gap="3">
        <ProgressBar
          label={`${filled} of ${plural(real.length, 'field', 'fields')} filled`}
          value={filled}
          max={real.length}
        />
        <Text size="sm" tone="muted">
          {[
            `${left} left`,
            plural(signatures, 'signature placed', 'signatures placed'),
            ...(suggested
              ? [plural(suggested, 'suggestion', 'suggestions')]
              : []),
          ].join(', ')}
        </Text>
        {left > 0 ? (
          <Inline>
            <Button
              size="sm"
              variant="solid"
              tone="accent"
              icon={fieldNext}
              onClick={() => advance(ctx, fields, fillSign.get().focusKey)}
            >
              Next empty field
            </Button>
          </Inline>
        ) : (
          <Text size="sm" tone="muted">
            Every field is filled
          </Text>
        )}
      </Stack>
    </InspectorSection>
  );
}
