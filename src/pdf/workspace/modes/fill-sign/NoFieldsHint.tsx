import { fieldSuggest, fieldText } from '@arshad-shah/cynosure/icons';
import { Button, Card, Inline, Stack } from '@arshad-shah/cynosure';
import { Place } from '@/pdf/surfaces/layers';
import type { ModeProps } from '../types';
import type { ViewField } from './fields';
import { useFillSign } from './store';

/**
 * Spec §13.3: when detection found nothing and the document has no form
 * fields, say so and offer the manual paths.
 */
export function NoFieldsHint({
  ctx,
  fields,
  width,
}: {
  ctx: ModeProps;
  fields: readonly ViewField[];
  /** The page's width on screen. */
  width: number;
}) {
  const progress = useFillSign((s) => s.progress);
  const draft = useFillSign((s) => s.draft);
  if (progress || fields.length > 0 || ctx.tool.id || draft) return null;
  return (
    <Place x={16} y={16} width={Math.min(384, Math.max(0, width - 32))}>
      <Card
        title="No form fields found"
        headingLevel={3}
        description="Draw the fields yourself, or click anywhere on the page to type."
      >
        <Stack gap="3">
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="outline"
              icon={fieldSuggest}
              onClick={() => ctx.tool.set('add-field')}
            >
              Detect manually
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={fieldText}
              onClick={() => ctx.tool.set('text')}
            >
              Click anywhere to type
            </Button>
          </Inline>
        </Stack>
      </Card>
    </Place>
  );
}
