import { useMemo, useState } from 'react';
import { useClipboard } from '@/shared/lib/clipboard';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  Center,
  Code,
  Inline,
  PaneTabs,
  SegmentedControl,
  ShareButton,
  Stack,
  usePaneTab,
} from '@/shared/ui';
import { QrCode } from '@/shared/ui/adapters/QrCode';
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
import type { QrStyle } from './lib/render';
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

export default function QrCodeGenerator() {
  const [settings, update] = qrSettings.useSettings();
  const [type, setType] = useState<PayloadType>('url');
  const [fields, setFields] = useState<PayloadFields>(DEFAULT_FIELDS);
  const [logo, setLogo] = useState('');
  const tab = usePaneTab('qr-code-generator', 'content');
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
        tab.show('style');
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

  const previewPane = (
    <Stack gap="4" className="min-w-0">
      <Card>
        <CardBody>
          <Stack gap="3">
            <Inline justify="end">
              <SegmentedControl
                label="Preview render"
                size="sm"
                value={settings.renderAs}
                onChange={(renderAs) => update({ renderAs })}
                options={[
                  { value: 'svg', label: 'SVG' },
                  { value: 'canvas', label: 'Canvas' },
                ]}
              />
            </Inline>
            {problem && (
              <Alert status="danger" size="sm">
                <AlertDescription>{problem}</AlertDescription>
              </Alert>
            )}
            <Center>
              <QrCode
                label="QR code preview"
                format={settings.renderAs}
                value={empty ? ' ' : value}
                size={settings.size}
                bg={settings.bg}
                fg={settings.fg}
                level={settings.ecc}
                includeMargin={settings.margin}
                imageSettings={
                  logo
                    ? {
                        src: logo,
                        width: Math.round(
                          settings.size * Math.sqrt(settings.logoFraction),
                        ),
                        height: Math.round(
                          settings.size * Math.sqrt(settings.logoFraction),
                        ),
                        excavate: settings.excavate,
                      }
                    : undefined
                }
              />
            </Center>
            <Code
              block
              className="max-h-32 overflow-auto break-all whitespace-pre-wrap"
              aria-label="Encoded text"
            >
              {value || ' '}
            </Code>
          </Stack>
        </CardBody>
      </Card>
      <ScanCheck value={empty ? '' : value} qrStyle={style} />
    </Stack>
  );

  // One pane at a time (ruling R41); Preview gets a dot when the code
  // changes while another pane is shown.
  return (
    <PaneTabs
      id="qr-code-generator"
      label="QR panes"
      value={tab.value}
      onValueChange={tab.show}
      actions={SECRET_TYPES.has(type) ? null : <ShareButton share={share} />}
      panes={[
        {
          id: 'content',
          label: 'Content',
          content: (
            <ContentForm
              type={type}
              onTypeChange={setType}
              fields={fields}
              onFieldChange={setField}
            />
          ),
        },
        {
          id: 'style',
          label: 'Style',
          content: (
            <StylePanel
              settings={settings}
              update={update}
              logo={logo}
              onLogoChange={setLogo}
            />
          ),
        },
        {
          id: 'preview',
          label: 'Preview',
          changeKey: `${value}|${JSON.stringify(style)}`,
          content: previewPane,
        },
        {
          id: 'export',
          label: 'Export',
          content: (
            <ExportPanel
              value={value}
              qrStyle={style}
              settings={settings}
              update={update}
              baseName={`qr-${type}`}
              disabled={empty}
            />
          ),
        },
        {
          id: 'batch',
          label: 'Batch',
          content: <BatchPanel qrStyle={style} />,
        },
      ]}
    />
  );
}
