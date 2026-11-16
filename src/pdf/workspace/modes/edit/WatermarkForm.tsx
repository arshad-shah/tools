import { ColorField } from './ColorField';
import { useState } from 'react';
import {
  Button,
  Inline,
  NumberField,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { FilePicker } from '../../ui/FilePicker';
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
import { PageRangeField } from '../../ui/PageRangeField';
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
        onChange={(v) => setMode(v as 'text' | 'image')}
        options={[
          { value: 'text' as const, label: 'Text' },
          { value: 'image' as const, label: 'Image' },
        ]}
      />
      {mode === 'text' ? (
        <>
          <TextField
            label="Watermark text"
            size="sm"
            value={label}
            onChange={setLabel}
            maxLength={500}
          />
          <NumberField
            label="Font size"
            size="sm"
            value={fontSize}
            onChange={(v) => v !== null && setFontSize(v)}
            min={6}
            max={400}
          />
          <ColorField label="Colour" value={color} onChange={setColor} />
        </>
      ) : (
        <>
          <FilePicker
            accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
            onFiles={(files) => files[0] && void pick(files[0])}
          >
            {(open) => (
              <Button variant="outline" size="sm" onClick={open}>
                {image ? 'Change image' : 'Choose image'}
              </Button>
            )}
          </FilePicker>
          {image ? (
            <Text size="sm" tone="muted">
              {image.name}
            </Text>
          ) : null}
          <Slider
            label="Image width (% of page)"
            showValue
            value={widthPct}
            onChange={(v) => setWidthPct(Number(v))}
            min={5}
            max={100}
          />
        </>
      )}
      <Slider
        label="Opacity"
        showValue
        value={opacityPct}
        onChange={(v) => setOpacityPct(Number(v))}
        min={5}
        max={100}
      />
      <Slider
        label="Rotation"
        showValue
        value={rotation}
        onChange={(v) => setRotation(Number(v))}
        min={-90}
        max={90}
        step={5}
      />
      <Select
        label="Position"
        size="sm"
        value={position}
        onChange={(v) => setPosition(v as Anchor)}
        options={ANCHOR_OPTIONS}
      />
      <PageRangeField
        mode={pageMode}
        text={ranges}
        onModeChange={setPageMode}
        onTextChange={setRanges}
        error={error}
      />
      <Inline gap="2" wrap>
        <Button
          variant="solid"
          tone="accent"
          size="sm"
          onClick={apply}
          disabled={blocked}
        >
          {current ? 'Update watermark' : 'Add watermark'}
        </Button>
        {activeMarkupId(doc, TYPE) ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove watermark
          </Button>
        ) : null}
      </Inline>
    </Stack>
  );
}
