import { IconCheck, IconX } from '@/shared/ui/icons';
import { PageBox, PageText, Text, type OverlayTransform } from '@/shared/ui';
import type { ViewField } from './fields';
import { effectiveStyle, overlayLayout, type FieldStyle } from './text-style';

/**
 * A field's value drawn over the page before export, where the writer will
 * put it: single-line text with its size, colour, spacing and character
 * boxes; multiline text wrapped; ticks and crosses as vector marks.
 */
export function FieldValue({
  field,
  value,
  settings: style,
  transform,
  quarter,
}: {
  field: ViewField;
  value: string;
  /** Overrides the field's own settings (live preview while adjusting). */
  settings?: FieldStyle;
  transform: OverlayTransform;
  quarter: boolean;
}) {
  if (!value || field.type === 'signature') return null;
  if (field.type === 'tick' || field.type === 'radio') {
    const Mark = field.mark === 'cross' ? IconX : IconCheck;
    return (
      <PageBox
        transform={transform}
        box={field.rect}
        className="pointer-events-none flex items-center justify-center text-fg"
      >
        <Mark size="sm" strokeWidth={2} />
      </PageBox>
    );
  }
  const s = style ?? effectiveStyle(field, quarter);
  if (field.type === 'multiline')
    return (
      <PageBox
        transform={transform}
        box={field.rect}
        className="pointer-events-none overflow-hidden p-0.5"
      >
        <Text size="xs" className="break-words whitespace-pre-wrap">
          {value}
        </Text>
      </PageBox>
    );
  const layout = overlayLayout(value, field.rect, s, quarter);
  return (
    <PageText
      transform={transform}
      box={field.rect}
      text={value}
      size={layout.size}
      color={s.color}
      x={layout.x}
      baseline={layout.baseline}
      data-testid={`value-${field.key}`}
    />
  );
}
