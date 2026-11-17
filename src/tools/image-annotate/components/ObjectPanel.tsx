import {
  Button,
  Grid,
  Inline,
  NumberField,
  Select,
  Slider,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { bringToFront, sendToBack, trash } from '@arshad-shah/cynosure/icons';
import type { Measure } from '../lib/draft';
import type { Rect } from '../lib/geometry';
import {
  boundsOfObject,
  describeObject,
  resizeObject,
  type AnnotObject,
} from '../lib/model';

export interface ObjectPanelProps {
  objects: readonly AnnotObject[];
  selected: AnnotObject | null;
  onSelect(id: string | null): void;
  /** A finished change: one undo step. */
  onChange(o: AnnotObject): void;
  onDelete(id: string): void;
  onOrder(id: string, to: 'forward' | 'backward'): void;
  measure: Measure;
  /** Id for the text field, so a placed text can focus it. */
  textFieldId?: string;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * The keyboard path to every object: pick it from the list, then set its
 * position, size, text or strength in fields, reorder or delete it.
 */
export function ObjectPanel({
  objects,
  selected,
  onSelect,
  onChange,
  onDelete,
  onOrder,
  measure,
  textFieldId,
}: ObjectPanelProps) {
  if (!objects.length)
    return (
      <Text tone="muted" size="sm">
        Nothing drawn yet. Drag on the image with a tool, or use Add in the
        middle and move it with the arrow keys.
      </Text>
    );
  const box = selected ? boundsOfObject(selected) : null;
  const setBox = (patch: Partial<Rect>) => {
    if (!selected || !box) return;
    const next = { ...box, ...patch };
    if (next.width < 1 || next.height < 1) return;
    onChange(resizeObject(selected, next, measure));
  };
  const field = (key: keyof Rect, label: string) => (
    <NumberField
      key={key}
      label={label}
      unit="px"
      size="sm"
      commit="blur"
      value={box ? round(box[key]) : null}
      min={key === 'width' || key === 'height' ? 1 : undefined}
      onChange={(v) => {
        if (v !== null) setBox({ [key]: v });
      }}
    />
  );
  return (
    <Stack gap="4">
      <Select
        label="Selected object"
        value={selected?.id ?? ''}
        emptyOption="None"
        onChange={(v) => onSelect(v || null)}
        options={objects.map((o) => ({
          value: o.id,
          label: describeObject(objects, o),
        }))}
      />
      {selected && box ? (
        <>
          {selected.type === 'text' ? (
            <TextArea
              id={textFieldId}
              label="Text content"
              rows={2}
              value={selected.text}
              onChange={(text) =>
                onChange({
                  ...selected,
                  text,
                  measured: measure(text || ' ', selected.size),
                })
              }
            />
          ) : null}
          {selected.type === 'blur' || selected.type === 'pixelate' ? (
            <Slider
              label="Strength"
              min={2}
              max={64}
              showValue
              value={selected.strength}
              onCommit={(v) =>
                onChange({
                  ...selected,
                  strength: Array.isArray(v) ? v[0] : (v as number),
                })
              }
              labels={{ value: (v) => `${v} px` }}
            />
          ) : null}
          <Grid columns={2} gap="3">
            {field('x', 'X')}
            {field('y', 'Y')}
            {field('width', 'Width')}
            {field('height', 'Height')}
          </Grid>
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="ghost"
              icon={bringToFront}
              onClick={() => onOrder(selected.id, 'forward')}
            >
              Bring forward
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={sendToBack}
              onClick={() => onOrder(selected.id, 'backward')}
            >
              Send backward
            </Button>
            <Button
              size="sm"
              variant="ghost"
              tone="danger"
              icon={trash}
              aria-keyshortcuts="Delete"
              onClick={() => onDelete(selected.id)}
            >
              Delete
            </Button>
          </Inline>
        </>
      ) : null}
    </Stack>
  );
}
