import {
  Button,
  Grid,
  Inline,
  NumberField,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import { check, close, maximize } from '@arshad-shah/cynosure/icons';
import {
  aspectRatio,
  clampCrop,
  CROP_ASPECTS,
  fitAspect,
  withAspect,
  type CropAspect,
} from '../lib/crop';
import type { Rect, Size } from '../lib/geometry';

export interface CropPanelProps {
  /** The pending crop, in the oriented image. */
  rect: Rect;
  /** The oriented image's size. */
  image: Size;
  aspect: CropAspect;
  onAspect(a: CropAspect): void;
  onRect(r: Rect): void;
  onApply(): void;
  onCancel(): void;
}

/** The crop's keyboard path: an aspect and exact pixel fields. */
export function CropPanel({
  rect,
  image,
  aspect,
  onAspect,
  onRect,
  onApply,
  onCancel,
}: CropPanelProps) {
  const ratio = aspectRatio(aspect, image);
  const set = (key: keyof Rect, v: number) => {
    let next = { ...rect, [key]: v };
    if (key === 'width' || key === 'height')
      next = withAspect(next, key, ratio);
    next = clampCrop(next, image);
    onRect(ratio ? fitAspect(next, ratio) : next);
  };
  const field = (key: keyof Rect, label: string) => (
    <NumberField
      key={key}
      label={label}
      unit="px"
      size="sm"
      commit="blur"
      min={key === 'width' || key === 'height' ? 1 : 0}
      value={Math.round(rect[key])}
      onChange={(v) => {
        if (v !== null) set(key, v);
      }}
    />
  );
  return (
    <Stack gap="4">
      <Select
        label="Aspect ratio"
        value={aspect}
        onChange={(v) => {
          const a = v as CropAspect;
          onAspect(a);
          const r = aspectRatio(a, image);
          if (r) onRect(fitAspect(rect, r));
        }}
        options={CROP_ASPECTS.map((a) => ({ value: a.value, label: a.label }))}
      />
      <Grid columns={2} gap="3">
        {field('x', 'Left')}
        {field('y', 'Top')}
        {field('width', 'Width')}
        {field('height', 'Height')}
      </Grid>
      <Inline gap="2" wrap>
        <Button variant="solid" tone="accent" icon={check} onClick={onApply}>
          Apply crop
        </Button>
        <Button
          variant="ghost"
          icon={maximize}
          onClick={() => {
            const whole = { x: 0, y: 0, ...image };
            onRect(ratio ? fitAspect(whole, ratio) : whole);
          }}
        >
          Whole image
        </Button>
        <Button variant="ghost" icon={close} onClick={onCancel}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
