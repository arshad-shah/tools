import { ColorField } from './ColorField';
import { useState } from 'react';
import {
  Button,
  FilePicker,
  Input,
  Label,
  NumberInput,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { loadFile } from '@/shared/lib/files';
import {
  ANCHOR_OPTIONS,
  trySelectPages,
  type Anchor,
} from '@/pdf/edit/geometry';
import { toEmbeddable } from '@/pdf/edit/image-embeddable';
import type { WatermarkParams } from '@/pdf/doc/ops/markup';
import { PageRangeField } from '@/pdf/components/PageRangeField';
import type { ModeProps } from '../types';
import { activeMarkup } from './markup-state';
import {
  activeMarkupId,
  applyMarkup,
  removeMarkup,
  selectionOf,
} from './form-helpers';

const TYPE = 'markup.watermark';

/** The old Watermark tool's fields, applied as a workspace operation. */
export function WatermarkForm({ doc }: ModeProps) {
  const current = activeMarkup(doc).watermark;
  const text = current?.content.kind === 'text' ? current.content : null;
  const img = current?.content.kind === 'image' ? current.content : null;
  const [mode, setMode] = useState<'text' | 'image'>(img ? 'image' : 'text');
  const [label, setLabel] = useState(text?.text ?? 'CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(text?.fontSize ?? 48);
  const [color, setColor] = useState(text?.color ?? '#9ca3af');
  const [image, setImage] = useState<{
    assetId: string;
    format: 'png' | 'jpeg';
    name: string;
  } | null>(
    img
      ? { assetId: img.assetId, format: img.format, name: 'Current image' }
      : null,
  );
  const [widthPct, setWidthPct] = useState(
    Math.round((img?.widthFraction ?? 0.4) * 100),
  );
  const [opacityPct, setOpacityPct] = useState(
    Math.round((current?.opacity ?? 0.3) * 100),
  );
  const [rotation, setRotation] = useState(current?.rotation ?? 45);
  const [position, setPosition] = useState<Anchor>(
    current?.position ?? 'center',
  );
  const [pageMode, setPageMode] = useState<'all' | 'ranges'>(
    current?.pages.mode ?? 'all',
  );
  const [ranges, setRanges] = useState(
    current?.pages.mode === 'ranges' ? current.pages.text : '',
  );
  const pages = selectionOf(pageMode, ranges);
  const { error } = trySelectPages(pages, doc.view.pages.length);

  const pick = async (file: File) => {
    try {
      const loaded = await loadFile(file, ['png', 'jpeg', 'webp', 'gif']);
      const { bytes, mime } = await toEmbeddable(loaded.bytes, file.name);
      const assetId = doc.addAsset(bytes, mime);
      setImage({
        assetId,
        format: mime === 'image/png' ? 'png' : 'jpeg',
        name: file.name,
      });
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const apply = () => {
    const content: WatermarkParams['content'] =
      mode === 'text'
        ? { kind: 'text', text: label, fontSize, color }
        : {
            kind: 'image',
            assetId: image!.assetId,
            format: image!.format,
            widthFraction: widthPct / 100,
          };
    applyMarkup(doc, TYPE, {
      content,
      opacity: opacityPct / 100,
      rotation,
      position,
      margin: 24,
      pages,
    });
  };

  const blocked =
    (mode === 'text' && !label.trim()) ||
    (mode === 'image' && !image) ||
    !!error;
  return (
    <Stack gap="3">
      <SegmentedControl
        label="Watermark type"
        size="sm"
        value={mode}
        onChange={(v) => setMode(v)}
        options={[
          { value: 'text' as const, label: 'Text' },
          { value: 'image' as const, label: 'Image' },
        ]}
      />
      {mode === 'text' ? (
        <>
          <Stack gap="1">
            <Label htmlFor="wm-text">Watermark text</Label>
            <Input
              id="wm-text"
              value={label}
              onChange={setLabel}
              maxLength={500}
            />
          </Stack>
          <Stack gap="1">
            <Label htmlFor="wm-size">Font size</Label>
            <NumberInput
              id="wm-size"
              value={fontSize}
              onValueChange={setFontSize}
              min={6}
              max={400}
            />
          </Stack>
          <ColorField label="Colour" value={color} onChange={setColor} />
        </>
      ) : (
        <>
          <FilePicker
            accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
            onFiles={(files) => files[0] && void pick(files[0])}
          >
            {(open) => (
              <Button variant="secondary" size="sm" onClick={open}>
                {image ? 'Change image' : 'Choose image'}
              </Button>
            )}
          </FilePicker>
          {image ? (
            <Text size="xs" tone="muted">
              {image.name}
            </Text>
          ) : null}
          <Stack gap="1">
            <Label htmlFor="wm-width">Image width (% of page)</Label>
            <Slider
              id="wm-width"
              aria-label="Image width"
              value={widthPct}
              onValueChange={setWidthPct}
              min={5}
              max={100}
            />
          </Stack>
        </>
      )}
      <Stack gap="1">
        <Label htmlFor="wm-opacity">Opacity</Label>
        <Slider
          id="wm-opacity"
          aria-label="Opacity"
          value={opacityPct}
          onValueChange={setOpacityPct}
          min={5}
          max={100}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="wm-rotation">Rotation</Label>
        <Slider
          id="wm-rotation"
          aria-label="Rotation"
          value={rotation}
          onValueChange={setRotation}
          min={-90}
          max={90}
          step={5}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="wm-position">Position</Label>
        <Select
          id="wm-position"
          value={position}
          onValueChange={(v) => setPosition(v as Anchor)}
          items={ANCHOR_OPTIONS}
        />
      </Stack>
      <PageRangeField
        id="wm"
        mode={pageMode}
        text={ranges}
        onModeChange={setPageMode}
        onTextChange={setRanges}
        error={error}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={apply} disabled={blocked}>
          {current ? 'Update watermark' : 'Add watermark'}
        </Button>
        {activeMarkupId(doc, TYPE) ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove watermark
          </Button>
        ) : null}
      </div>
    </Stack>
  );
}
