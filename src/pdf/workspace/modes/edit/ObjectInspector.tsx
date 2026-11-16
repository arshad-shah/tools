import { ColorField } from './ColorField';
import { useState } from 'react';
import {
  Button,
  Inline,
  LoadingDots,
  Notice,
  NumberField,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { InspectorSection } from '../../ui/InspectorSection';
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
    <Notice
      tone="warning"
      size="sm"
      action={
        <Button size="sm" variant="outline" onClick={onFix}>
          Use Unicode font
        </Button>
      }
    >
      {`This font cannot draw ${bad.length === 1 ? 'one character' : `${bad.length} characters`} in the text.`}
    </Notice>
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
      <TextArea
        label="Text"
        value={value}
        rows={3}
        onChange={(v) => setDraft({ base: p.text, value: v })}
        onBlur={commit}
      />
      <Unsupported
        font={p.font}
        text={value}
        onFix={() => set({ font: 'unicode' })}
      />
      <Select
        label="Font"
        size="sm"
        value={p.font}
        onChange={(font) => set({ font })}
        options={FONT_ITEMS}
        description={
          ready ? undefined : (
            <Inline gap="2" align="center">
              <LoadingDots size="sm" tone="muted" label="Loading the font" />
              Loading the font
            </Inline>
          )
        }
      />
      <NumberField
        label="Size"
        size="sm"
        value={p.size}
        min={4}
        max={288}
        onChange={(size) => size !== null && set({ size })}
      />
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
        <NumberField
          label="Line height"
          size="sm"
          value={p.lineHeight}
          min={0.8}
          max={3}
          step={0.1}
          onChange={(lineHeight) => lineHeight !== null && set({ lineHeight })}
        />
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
          <Text as="p" size="sm">
            {COVER_COPY}
          </Text>
          <Inline>
            <Button
              size="sm"
              variant="outline"
              disabled={!redact || !nav}
              onClick={() => nav?.('redact')}
            >
              Open Redact
            </Button>
          </Inline>
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
          <Slider
            label="Opacity"
            showValue
            labels={{ value: (v) => `${v}%` }}
            value={Math.round(p.opacity * 100)}
            min={5}
            max={100}
            step={5}
            onCommit={(v) => set({ opacity: Number(v) / 100 })}
          />
          <Switch
            label="Keep aspect ratio"
            checked={p.keepAspect}
            onChange={(keepAspect) => set({ keepAspect })}
          />
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
            <Switch
              label="Outline"
              checked={p.stroke !== null}
              onChange={(on) => set({ stroke: on ? '#000000' : null })}
            />
            <Switch
              label="Fill"
              checked={p.fill !== null}
              onChange={(on) => set({ fill: on ? '#e5e7eb' : null })}
            />
            {p.fill ? (
              <ColorField
                label="Fill colour"
                value={p.fill}
                onChange={(fill) => set({ fill })}
              />
            ) : null}
          </>
        ) : null}
        <NumberField
          label="Line width"
          size="sm"
          value={p.width}
          min={0.25}
          max={50}
          step={0.5}
          onChange={(width) => width !== null && set({ width })}
        />
      </Stack>
    </InspectorSection>
  );
}
