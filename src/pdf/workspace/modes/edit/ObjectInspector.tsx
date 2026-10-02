import { ColorField } from './ColorField';
import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  InspectorSection,
  Label,
  NumberInput,
  SegmentedControl,
  Select,
  Slider,
  Spinner,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@/shared/ui';
import { unsupportedChars } from '@/pdf/edit/fonts';
import type {
  ContentFont,
  ContentShapeParams,
  ImageParams,
  TextParams,
} from '@/pdf/doc/ops/edit';
import type { CoverParams } from '@/pdf/doc/ops/cover';
import type { OverlayItem } from '@/pdf/doc/types';
import type { ModeContext, ModeProps } from '../types';
import { getMode } from '../registry';
import { COVER_COPY } from './TextPrompt';
import { useFontReady, useTextLayout } from './use-font-ready';

const FONT_ITEMS: { value: ContentFont; label: string }[] = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times-Roman', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
  { value: 'unicode', label: 'Unicode (Noto Sans)' },
];
const ALIGNS = [
  { value: 'left' as const, label: 'Left' },
  { value: 'center' as const, label: 'Centre' },
  { value: 'right' as const, label: 'Right' },
];

/** content.update for one field. */
const updater =
  (ctx: ModeProps, o: OverlayItem) => (patch: Record<string, unknown>) =>
    ctx.doc.dispatch({
      type: 'content.update',
      params: { targetId: o.opId, patch },
    });

/** Characters the chosen standard font cannot draw, with the "Use Unicode font" fix. */
function Unsupported({
  font,
  text,
  onFix,
}: {
  font: ContentFont;
  text: string;
  onFix(): void;
}) {
  const layout = useTextLayout(
    font === 'unicode' ? 'unicode' : (font as 'Helvetica'),
  );
  if (!layout || font === 'unicode') return null;
  const bad = unsupportedChars(layout.font, text.replace(/\n/g, ''));
  if (bad.length === 0) return null;
  return (
    <Alert status="warning">
      <AlertDescription>
        <Stack gap="2">
          <span>
            This font cannot draw{' '}
            {bad.length === 1 ? 'one character' : `${bad.length} characters`} in
            the text.
          </span>
          <div>
            <Button size="sm" variant="secondary" onClick={onFix}>
              Use Unicode font
            </Button>
          </div>
        </Stack>
      </AlertDescription>
    </Alert>
  );
}

function TextFields({
  ctx,
  item,
  p,
}: {
  ctx: ModeProps;
  item: OverlayItem;
  p: Pick<TextParams, 'text' | 'font' | 'size' | 'color' | 'align'> & {
    lineHeight?: number;
  };
}) {
  const set = updater(ctx, item);
  const [draft, setDraft] = useState<{ base: string; value: string } | null>(
    null,
  );
  const value = draft?.base === p.text ? draft.value : p.text;
  const ready = useFontReady(p.font);
  const commit = () => {
    setDraft(null);
    if (value !== p.text && (value.trim() || item.type === 'content.cover'))
      set({ text: value });
  };
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Label htmlFor="edit-text">Text</Label>
        <Textarea
          id="edit-text"
          value={value}
          rows={3}
          onChange={(v) => setDraft({ base: p.text, value: v })}
          onBlur={commit}
        />
      </Stack>
      <Unsupported
        font={p.font}
        text={value}
        onFix={() => set({ font: 'unicode' })}
      />
      <Stack gap="1">
        <div className="flex items-center gap-2">
          <Label htmlFor="edit-font">Font</Label>
          {!ready ? <Spinner size="sm" label="Loading the font" /> : null}
        </div>
        <Select
          id="edit-font"
          value={p.font}
          onValueChange={(font) => set({ font })}
          items={FONT_ITEMS}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="edit-size">Size</Label>
        <NumberInput
          id="edit-size"
          value={p.size}
          min={4}
          max={288}
          onValueChange={(size) => set({ size })}
        />
      </Stack>
      <ColorField
        label="Text colour"
        value={p.color}
        onChange={(color) => set({ color })}
      />
      <SegmentedControl
        label="Alignment"
        size="sm"
        value={p.align}
        options={ALIGNS}
        onChange={(align) => set({ align })}
      />
      {p.lineHeight !== undefined ? (
        <Stack gap="1">
          <Label htmlFor="edit-line-height">Line height</Label>
          <NumberInput
            id="edit-line-height"
            value={p.lineHeight}
            min={0.8}
            max={3}
            step={0.1}
            onValueChange={(lineHeight) => set({ lineHeight })}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}

/** Properties of one selected Edit object (spec §9.2 inspector). */
export function ObjectInspector({
  ctx,
  item,
}: {
  ctx: ModeProps;
  item: OverlayItem;
}) {
  const set = updater(ctx, item);
  if (item.type === 'content.text')
    return (
      <InspectorSection title="Text box">
        <TextFields ctx={ctx} item={item} p={item.params as TextParams} />
      </InspectorSection>
    );
  if (item.type === 'content.cover') {
    const p = item.params as CoverParams;
    const nav = (ctx as Partial<ModeContext>).navigateMode;
    const redact = getMode('redact');
    return (
      <InspectorSection title="Cover and replace">
        <Stack gap="3">
          <Text size="sm">{COVER_COPY}</Text>
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!redact || !nav}
              title={
                redact
                  ? undefined
                  : 'Redact is not available in this version yet'
              }
              onClick={() => nav?.('redact')}
            >
              Open Redact
            </Button>
          </div>
          <ColorField
            label="Cover colour"
            value={p.fill}
            onChange={(fill) => set({ fill })}
          />
          <TextFields ctx={ctx} item={item} p={p} />
        </Stack>
      </InspectorSection>
    );
  }
  if (item.type === 'content.image') {
    const p = item.params as ImageParams;
    return (
      <InspectorSection title="Image">
        <Stack gap="3">
          <Stack gap="1">
            <Label htmlFor="edit-image-opacity">Opacity</Label>
            <Slider
              id="edit-image-opacity"
              aria-label="Opacity"
              value={Math.round(p.opacity * 100)}
              min={5}
              max={100}
              step={5}
              onValueChange={(v) => set({ opacity: v / 100 })}
            />
          </Stack>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="edit-keep-aspect">Keep aspect ratio</Label>
            <Switch
              id="edit-keep-aspect"
              checked={p.keepAspect}
              onCheckedChange={(keepAspect) => set({ keepAspect })}
            />
          </div>
        </Stack>
      </InspectorSection>
    );
  }
  const p = item.params as ContentShapeParams;
  const line = p.kind === 'line' || p.kind === 'arrow';
  return (
    <InspectorSection title="Shape">
      <Stack gap="3">
        <ColorField
          label="Stroke colour"
          value={p.stroke ?? '#000000'}
          onChange={(stroke) => set({ stroke })}
        />
        {!line ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-no-stroke">Outline</Label>
              <Switch
                id="edit-no-stroke"
                checked={p.stroke !== null}
                onCheckedChange={(on) => set({ stroke: on ? '#000000' : null })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-fill-on">Fill</Label>
              <Switch
                id="edit-fill-on"
                checked={p.fill !== null}
                onCheckedChange={(on) => set({ fill: on ? '#e5e7eb' : null })}
              />
            </div>
            {p.fill ? (
              <ColorField
                label="Fill colour"
                value={p.fill}
                onChange={(fill) => set({ fill })}
              />
            ) : null}
          </>
        ) : null}
        <Stack gap="1">
          <Label htmlFor="edit-width">Line width</Label>
          <NumberInput
            id="edit-width"
            value={p.width}
            min={0.25}
            max={50}
            step={0.5}
            onValueChange={(width) => set({ width })}
          />
        </Stack>
      </Stack>
    </InspectorSection>
  );
}
