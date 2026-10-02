import { IconFieldSuggested, IconFieldText } from '@/shared/ui/icons';
import { Button, Card, CardBody, Text } from '@/shared/ui';
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
}: {
  ctx: ModeProps;
  fields: readonly ViewField[];
}) {
  const progress = useFillSign((s) => s.progress);
  const draft = useFillSign((s) => s.draft);
  if (progress || fields.length > 0 || ctx.tool.id || draft) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-4 top-4 flex justify-center">
      <Card className="max-w-sm">
        <CardBody className="flex flex-col gap-3">
          <Text weight="medium">No form fields found</Text>
          <Text size="sm" tone="muted">
            Draw the fields yourself, or click anywhere on the page to type.
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconFieldSuggested size="sm" />}
              onClick={() => ctx.tool.set('add-field')}
            >
              Detect manually
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconFieldText size="sm" />}
              onClick={() => ctx.tool.set('text')}
            >
              Click anywhere to type
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
