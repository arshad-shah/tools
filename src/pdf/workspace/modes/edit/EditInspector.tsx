import { ColorField } from './ColorField';
import {
  Button,
  InspectorSection,
  Label,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
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
        <div className="grid grid-cols-2 gap-1">
          {aligns.map(([how, label]) => (
            <Button
              key={how}
              size="sm"
              variant="secondary"
              onClick={() => act.align(how)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={n < 3}
            onClick={() => act.distribute('horizontal')}
          >
            Distribute across
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={n < 3}
            onClick={() => act.distribute('vertical')}
          >
            Distribute down
          </Button>
        </div>
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
        <Stack gap="1">
          <Label htmlFor="edit-default-font">Font</Label>
          <Select
            id="edit-default-font"
            value={ui.text.font}
            onValueChange={(font) =>
              setEditUi({ text: { ...ui.text, font: font as ContentFont } })
            }
            items={FONTS}
          />
        </Stack>
        <Stack gap="1">
          <Label htmlFor="edit-default-size">Text size</Label>
          <NumberInput
            id="edit-default-size"
            value={ui.text.size}
            min={4}
            max={288}
            onValueChange={(size) => setEditUi({ text: { ...ui.text, size } })}
          />
        </Stack>
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
    <div>
      {HINTS[tool] ? (
        <div className="p-3">
          <Text size="sm" tone="muted">
            {HINTS[tool]}
          </Text>
        </div>
      ) : null}
      {selected.length === 1 ? (
        <ObjectInspector ctx={ctx} item={selected[0]} />
      ) : null}
      <Arrange {...ctx} />
      {selected.length === 0 ? <Defaults /> : null}
    </div>
  );
}
