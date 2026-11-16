import { ColorField } from './ColorField';
import {
  Button,
  Grid,
  NumberField,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { InspectorSection } from '../../ui/InspectorSection';
import type { ContentFont } from '@/pdf/doc/ops/edit';
import type { ModeProps } from '../types';
import {
  objectActions,
  selectedObjects,
} from '../../objects/useObjectSelection';
import { HeaderFooterForm } from './HeaderFooterForm';
import { ObjectInspector } from './ObjectInspector';
import { PageNumbersForm } from './PageNumbersForm';
import { setEditUi, toolOf, useEditUi } from './ui-store';
import { WatermarkForm } from './WatermarkForm';

const FONTS: { value: ContentFont; label: string }[] = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times-Roman', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
  { value: 'unicode', label: 'Unicode (Noto Sans)' },
];

function Arrange(ctx: ModeProps) {
  const n = selectedObjects(ctx.doc, ctx.selection).length;
  if (n < 2) return null;
  const act = objectActions(ctx.doc, ctx.selection);
  const aligns = [
    ['left', 'Align left'],
    ['center', 'Align centres'],
    ['right', 'Align right'],
    ['top', 'Align top'],
    ['middle', 'Align middles'],
    ['bottom', 'Align bottom'],
  ] as const;
  return (
    <InspectorSection title="Arrange">
      <Stack gap="2">
        <Grid columns={2} gap="2">
          {aligns.map(([how, label]) => (
            <Button
              key={how}
              size="sm"
              variant="outline"
              fullWidth
              onClick={() => act.align(how)}
            >
              {label}
            </Button>
          ))}
        </Grid>
        <Grid columns={2} gap="2">
          <Button
            size="sm"
            variant="outline"
            fullWidth
            disabled={n < 3}
            onClick={() => act.distribute('horizontal')}
          >
            Distribute across
          </Button>
          <Button
            size="sm"
            variant="outline"
            fullWidth
            disabled={n < 3}
            onClick={() => act.distribute('vertical')}
          >
            Distribute down
          </Button>
        </Grid>
      </Stack>
    </InspectorSection>
  );
}

/** New-object defaults: the text style and shape style the tools use. */
function Defaults() {
  const ui = useEditUi();
  return (
    <InspectorSection title="New objects">
      <Stack gap="3">
        <Select
          label="Font"
          size="sm"
          value={ui.text.font}
          onChange={(font) =>
            setEditUi({ text: { ...ui.text, font: font as ContentFont } })
          }
          options={FONTS}
        />
        <NumberField
          label="Text size"
          size="sm"
          value={ui.text.size}
          min={4}
          max={288}
          onChange={(size) =>
            size !== null && setEditUi({ text: { ...ui.text, size } })
          }
        />
        <ColorField
          label="Text colour"
          value={ui.text.color}
          onChange={(color) => setEditUi({ text: { ...ui.text, color } })}
        />
        <ColorField
          label="Shape colour"
          value={ui.shape.stroke ?? '#000000'}
          onChange={(stroke) => setEditUi({ shape: { ...ui.shape, stroke } })}
        />
      </Stack>
    </InspectorSection>
  );
}

const HINTS: Partial<Record<ReturnType<typeof toolOf>, string>> = {
  text: 'Click to add text, or drag to draw a text box.',
  image: 'Click to place the image, or drag to size it.',
  shape: 'Drag to draw the shape.',
  cover: 'Drag over text to cover it, then type the replacement.',
};

/** The pinned Edit inspector: forms for markup tools, the selection's properties, or defaults. */
export function EditInspector(ctx: ModeProps) {
  const tool = toolOf(ctx.tool.id);
  if (tool === 'watermark')
    return (
      <InspectorSection title="Watermark">
        <WatermarkForm {...ctx} />
      </InspectorSection>
    );
  if (tool === 'page-numbers')
    return (
      <InspectorSection title="Page numbers">
        <PageNumbersForm {...ctx} />
      </InspectorSection>
    );
  if (tool === 'header-footer')
    return (
      <InspectorSection title="Header and footer">
        <HeaderFooterForm {...ctx} />
      </InspectorSection>
    );
  const selected = selectedObjects(ctx.doc, ctx.selection);
  return (
    <Stack gap="3">
      {HINTS[tool] ? (
        <Text as="p" size="sm" tone="muted">
          {HINTS[tool]}
        </Text>
      ) : null}
      {selected.length === 1 ? (
        <ObjectInspector ctx={ctx} item={selected[0]} />
      ) : null}
      <Arrange {...ctx} />
      {selected.length === 0 ? <Defaults /> : null}
    </Stack>
  );
}
