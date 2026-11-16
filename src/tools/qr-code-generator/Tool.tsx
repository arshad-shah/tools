import {
  Card,
  CodeBlock,
  EmptyState,
  Image,
  Inline,
  LoadingDots,
  Notice,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import { qrCode } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo, useState } from 'react';
import { ShareButton, ToolActions, TransformLayout } from '@/app/ui/transform';
import { useClipboard } from '@/shared/lib/clipboard';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { useMediaQuery } from '@/shared/lib/media-query';
import { useBlobUrl } from '@/shared/lib/object-url';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { BatchPanel } from './components/BatchPanel';
import { ContentForm } from './components/ContentForm';
import { ExportPanel } from './components/ExportPanel';
import { ScanCheck } from './components/ScanCheck';
import { StylePanel } from './components/StylePanel';
import {
  buildPayload,
  DEFAULT_FIELDS,
  geoProblem,
  SECRET_TYPES,
  type PayloadFields,
  type PayloadType,
} from './lib/payloads';
import { qrSvg, svgToPng, type QrStyle } from './lib/render';
import { qrSettings } from './settings';
import { canShareType, parseQrShare, QR_SHARE_VERSION } from './share';

const COLORS_MIME = 'application/vnd.tools.colors+json';
const HEX = /^#[0-9a-f]{6}$/i;

const accepts = (p: HandoffPayload) =>
  p.kind === 'text' &&
  ['text/uri-list', 'text/plain', COLORS_MIME].includes(p.mime);

/** The value is the first URL of a uri-list, or the text. */
function fromText(
  p: HandoffPayload,
): { type: PayloadType; text: string } | null {
  if (p.kind !== 'text' || p.mime === COLORS_MIME) return null;
  const line =
    p.mime === 'text/uri-list'
      ? (p.text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#')) ??
        '')
      : p.text;
  const text = line.trim();
  return /^https?:\/\//i.test(text)
    ? { type: 'url', text }
    : { type: 'text', text: p.text };
}

/**
 * The preview: the code drawn by the same renderer the downloads use, as
 * an SVG or a PNG (the "Preview render" setting), so it shows exactly what
 * is exported.
 */
function useQrImage(
  value: string,
  style: QrStyle,
  size: number,
  as: 'svg' | 'canvas',
): { blob: Blob | null; key: string } {
  const key = JSON.stringify([value, style, size, as]);
  const [made, setMade] = useState<{ key: string; blob: Blob } | null>(null);
  useEffect(() => {
    if (!value) return;
    let live = true;
    void qrSvg(value, style, size)
      .then((svg) =>
        as === 'svg'
          ? new Blob([svg], { type: 'image/svg+xml' })
          : svgToPng(svg, size * 2),
      )
      .then(
        (blob) => live && setMade({ key, blob }),
        () => {},
      );
    return () => {
      live = false;
    };
    // `key` stands for value, style, size and as.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // The last image stays until the new one is drawn, so typing never flickers.
  return { blob: made?.blob ?? null, key };
}

type Mode = 'single' | 'batch';

/**
 * QR Code Generator (redesign spec, transform pattern): the content and
 * style beside the code, its encoded text, a decode self-test and export;
 * or a batch from a CSV.
 */
export default function QrCodeGenerator() {
  const [settings, update] = qrSettings.useSettings();
  const [type, setType] = useState<PayloadType>('url');
  const [fields, setFields] = useState<PayloadFields>(DEFAULT_FIELDS);
  const [logo, setLogo] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const wide = useMediaQuery('(min-width: 1200px)');
  const { copy } = useClipboard();

  const value = useMemo(() => buildPayload(type, fields[type]), [type, fields]);
  const problem = type === 'geo' ? geoProblem(fields.geo) : null;
  const style: QrStyle = {
    fg: settings.fg,
    bg: settings.bg,
    ecc: settings.ecc,
    margin: settings.margin ? 4 : 0,
    logo,
    logoFraction: logo ? settings.logoFraction : 0,
    excavate: settings.excavate,
  };

  const share = useShareableState({
    toolId: 'qr-code-generator',
    version: QR_SHARE_VERSION,
    parse: parseQrShare,
    select: () => ({
      v: 1 as const,
      type,
      fields: canShareType(type) ? fields[type] : {},
      style: {
        fg: settings.fg,
        bg: settings.bg,
        ecc: settings.ecc,
        margin: settings.margin,
      },
    }),
  });

  // Hydrate once per incoming link or hand-off (state adjusted while rendering).
  const handoff = useHandoff(accepts);
  const incoming = share.loaded ?? handoff;
  const [hydrated, setHydrated] = useState<unknown>(null);
  if (incoming && hydrated !== incoming) {
    setHydrated(incoming);
    if (share.loaded) {
      const s = share.loaded;
      setType(s.type);
      setFields((f) => ({ ...f, [s.type]: s.fields }));
      update(s.style);
    } else if (handoff?.kind === 'text' && handoff.mime === COLORS_MIME) {
      try {
        const c = JSON.parse(handoff.text) as { fg?: unknown; bg?: unknown };
        if (typeof c.fg === 'string' && HEX.test(c.fg)) update({ fg: c.fg });
        if (typeof c.bg === 'string' && HEX.test(c.bg)) update({ bg: c.bg });
        setMode('single');
      } catch {
        // Not colours after all: keep the current style.
      }
    } else if (handoff) {
      const t = fromText(handoff);
      if (t) {
        setType(t.type);
        setFields((f) =>
          t.type === 'url'
            ? { ...f, url: { url: t.text } }
            : { ...f, text: { text: t.text } },
        );
      }
    }
  }

  const setField = (t: PayloadType, key: string, v: string | boolean) =>
    setFields((f) => ({ ...f, [t]: { ...f[t], [key]: v } }));

  useToolCommands('qr-code-generator', [
    {
      id: 'copy',
      label: 'Copy encoded text',
      shortcut: 'Mod+Shift+C',
      run: () => void copy(value, 'value'),
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => setFields((f) => ({ ...f, [type]: DEFAULT_FIELDS[type] })),
    },
    {
      id: 'share',
      label: 'Copy share link',
      shortcut: 'Mod+Shift+S',
      enabled: canShareType(type) && share.canShare,
      run: () => void share.share(),
    },
  ]);

  const empty = value.trim() === '' || !!problem;
  const image = useQrImage(
    empty ? '' : value,
    style,
    settings.size,
    settings.renderAs,
  );
  const src = useBlobUrl(empty ? null : image.blob);

  const contentCard = (
    <Card as="section" title="Content">
      <ContentForm
        type={type}
        onTypeChange={setType}
        fields={fields}
        onFieldChange={setField}
      />
    </Card>
  );
  const styleCard = (
    <Card as="section" title="Style">
      <StylePanel
        settings={settings}
        update={update}
        logo={logo}
        onLogoChange={setLogo}
      />
    </Card>
  );

  const previewCard = (
    <Card
      as="section"
      title="Preview"
      actions={
        <SegmentedControl
          label="Preview render"
          size="sm"
          value={settings.renderAs}
          onChange={(renderAs) =>
            update({ renderAs: renderAs as 'svg' | 'canvas' })
          }
          options={[
            { value: 'svg', label: 'SVG' },
            { value: 'canvas', label: 'Canvas' },
          ]}
        />
      }
    >
      <Stack gap="5">
        {problem ? <Notice tone="danger">{problem}</Notice> : null}
        {empty ? (
          <EmptyState
            icon={qrCode}
            title="Nothing to encode yet"
            description="Fill in the content to see the code, check that it scans and download it."
          />
        ) : (
          <Inline justify="center">
            {src ? (
              <Image
                src={src}
                alt="QR code preview"
                width={settings.size}
                height={settings.size}
                loading="eager"
              />
            ) : (
              <LoadingDots tone="muted" />
            )}
          </Inline>
        )}
        <CodeBlock title="Encoded text" code={value || ' '} wrap size="sm" />
        <ScanCheck value={empty ? '' : value} qrStyle={style} />
      </Stack>
    </Card>
  );
  const exportCard = (
    <Card as="section" title="Export">
      <ExportPanel
        value={value}
        qrStyle={style}
        settings={settings}
        update={update}
        baseName={`qr-${type}`}
        disabled={empty}
      />
    </Card>
  );

  return (
    <Stack gap="6">
      {SECRET_TYPES.has(type) ? null : (
        <ToolActions>
          <ShareButton share={share} />
        </ToolActions>
      )}
      <Inline>
        <SegmentedControl
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'single', label: 'One code' },
            { value: 'batch', label: 'Batch from CSV' },
          ]}
        />
      </Inline>
      {mode === 'single' ? (
        wide ? (
          <TransformLayout
            start={
              <Stack gap="6">
                {contentCard}
                {styleCard}
              </Stack>
            }
            end={
              <Stack gap="6">
                {previewCard}
                {exportCard}
              </Stack>
            }
          />
        ) : (
          // Stacked: the code right under what it encodes.
          <Stack gap="6">
            {contentCard}
            {previewCard}
            {styleCard}
            {exportCard}
          </Stack>
        )
      ) : (
        <BatchPanel qrStyle={style} />
      )}
    </Stack>
  );
}
