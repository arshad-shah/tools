import { IconCheck, IconX } from '@/shared/ui/icons';
import { PageBox, PageText, type OverlayTransform } from '@/shared/ui';
import type { ViewField } from './fields';
import { effectiveStyle, overlayLayout, type FieldStyle } from './text-style';

/**
 * A field's value drawn over the page before export, where the writer will
 * put it: text with its size, colour, spacing and character boxes, multiline
 * text wrapped by the writer's own layout; ticks and crosses as vector
 * marks.
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
  if (field.type === 'signature') return null;
  // The page render already shows a widget's own value; drawing it again
  // doubled it. A changed value covers the old appearance instead.
  if (field.drawnByPage && value === field.value) return null;
  const cover =
    field.coversPage || (field.drawnByPage && value !== field.value) ? (
      <PageBox
        transform={transform}
        box={field.rect}
        className="pointer-events-none border border-fg/30 bg-white"
      />
    ) : null;
  if (!value) return cover;
  if (field.type === 'tick' || field.type === 'radio') {
    const Mark = field.mark === 'cross' ? IconX : IconCheck;
    return (
      <>
        {cover}
        <PageBox
          transform={transform}
          box={field.rect}
          className="pointer-events-none flex items-center justify-center text-fg"
        >
          <Mark size="sm" strokeWidth={2} />
        </PageBox>
      </>
    );
  }
  const s = style ?? effectiveStyle(field, quarter);
  if (field.type === 'multiline') {
    const wrapped = overlayLayout(value, field.rect, s, quarter, true);
    return (
      <>
        {cover}
        {wrapped.lines.map((line, i) => (
          <PageText
            key={i}
            transform={transform}
            box={field.rect}
            text={line.chars.join('')}
            size={wrapped.size}
            color={s.color}
            x={line.x}
            baseline={line.baseline}
            data-testid={i === 0 ? `value-${field.key}` : undefined}
          />
        ))}
      </>
    );
  }
  const layout = overlayLayout(value, field.rect, s, quarter);
  return (
    <>
      {cover}
      <PageText
        transform={transform}
        box={field.rect}
        text={layout.chars.join('')}
        size={layout.size}
        color={s.color}
        x={layout.x}
        baseline={layout.baseline}
        data-testid={`value-${field.key}`}
      />
    </>
  );
}
