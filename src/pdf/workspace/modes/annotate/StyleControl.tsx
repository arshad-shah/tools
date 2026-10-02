import {
  ColorSwatchPicker,
  Label,
  SegmentedControl,
  Slider,
  Stack,
  Swatch,
} from '@/shared/ui';
import { ToolbarPanel } from '../../ToolbarPanel';
import type { ModeProps } from '../types';
import { INKS, setAnnotateUi, useAnnotateUi, WIDTHS } from './ui-store';

/** The one selected pending annotation, if any. */
function selectedPending(ctx: ModeProps) {
  if (ctx.selection.objects.size !== 1) return null;
  const [id] = ctx.selection.objects;
  for (const [pageId, list] of ctx.doc.view.overlays) {
    const o = list.find((x) => x.opId === id && x.type.startsWith('annot.'));
    if (o) return { pageId, item: o };
  }
  return null;
}

/**
 * Colour, opacity and width of new annotations; a selected annotation
 * takes a new colour too (one undo step).
 */
export function StyleFields({ ctx }: { ctx: ModeProps }) {
  const ui = useAnnotateUi();
  const picked = selectedPending(ctx);
  const pickedColor = (picked?.item.params as { color?: string } | undefined)
    ?.color;
  return (
    <Stack gap="3">
      <ColorSwatchPicker
        label={pickedColor ? 'Colour of the selected annotation' : 'Colour'}
        value={pickedColor ?? ui.color}
        onChange={(color) => {
          setAnnotateUi({ color });
          if (picked && pickedColor)
            ctx.doc.dispatch({
              type: 'annot.update',
              params: {
                pageId: picked.pageId,
                target: { kind: 'pending', id: picked.item.opId },
                patch: { color },
              },
            });
        }}
        options={INKS}
        allowCustom
      />
      <Stack gap="1">
        <Label htmlFor="annotate-opacity">Opacity</Label>
        <Slider
          id="annotate-opacity"
          aria-label="Opacity"
          value={Math.round(ui.opacity * 100)}
          min={10}
          max={100}
          step={5}
          onValueChange={(v) => setAnnotateUi({ opacity: v / 100 })}
        />
      </Stack>
      <SegmentedControl
        label="Width"
        size="sm"
        value={String(ui.width) as '1' | '2' | '4'}
        onChange={(v) => setAnnotateUi({ width: Number(v) })}
        options={WIDTHS.map((w) => ({ value: w.value, label: w.label }))}
      />
    </Stack>
  );
}

/**
 * The toolbar's Style control (backlog P5-D): the current colour, opening
 * the style fields by the button (a bottom sheet on phones).
 */
export function StyleControl({ ctx }: { ctx: ModeProps }) {
  const ui = useAnnotateUi();
  const ink = INKS.find((i) => i.value === ui.color)?.label ?? ui.color;
  return (
    <ToolbarPanel
      layout={ctx.layout}
      label={`Style: ${ink}`}
      text="Style"
      leading={<Swatch color={ui.color} label={ink} size="sm" variant="dot" />}
      title="Annotation style"
    >
      <StyleFields ctx={ctx} />
    </ToolbarPanel>
  );
}
