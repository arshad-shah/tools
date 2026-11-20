import {
  Button,
  Card,
  CopyButton,
  Disclosure,
  EmptyState,
  IconButton,
  Inline,
  Menu,
  Notice,
  SegmentedControl,
  Stack,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import {
  clipboardPaste,
  close,
  link,
  qrCode,
  send,
  sparkles,
  type as typeIcon,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShareButton, ToolActions, TransformLayout } from '@/app/ui/transform';
import { readClipboardText, useClipboard } from '@/shared/lib/clipboard';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { sendTo, useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { AnatomyStrip } from './components/AnatomyStrip';
import { CleanPanel } from './components/CleanPanel';
import { DomainPanel } from './components/DomainPanel';
import { ParamsEditor } from './components/ParamsEditor';
import { PartsEditor } from './components/PartsEditor';
import { asUriList, toHttpClient, urlFromHandoff } from './lib/actions';
import { anatomy, reuseIds } from './lib/anatomy';
import { buildUrl } from './lib/build';
import { parseUrlModel, type UrlModel } from './lib/model';
import { urlSettings } from './settings';
import {
  parseUrlShare,
  secretQueryKeys,
  toUrlShare,
  URL_SHARE_VERSION,
} from './share';

const SAMPLE =
  'https://user@www.example.com:8080/path/to/page.html?query=string&foo=bar&utm_source=news#section';

type Section = 'parts' | 'params' | 'domain' | 'clean';

type Parsed =
  | { model: UrlModel; error: null }
  | { model: null; error: ToolError };

function parse(text: string, base: string, prev: UrlModel | null): Parsed {
  try {
    const model = parseUrlModel(text, base);
    if (prev) model.params = reuseIds(prev.params, model.params);
    return { model, error: null };
  } catch (e) {
    return { model: null, error: toToolError(e, 'Not a valid URL') };
  }
}

/**
 * URL Inspector (redesign spec, transform pattern): the URL and its anatomy
 * beside its parts, query, domain and a clean link, every part editable.
 */
export default function UrlInspector() {
  const navigate = useNavigate();
  const [settings, update] = urlSettings.useSettings();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Parsed>(() => parse('', '', null));
  const { copy } = useClipboard();
  const [tab, setTab] = useState<Section>('parts');

  const share = useShareableState({
    toolId: 'url-parser',
    version: URL_SHARE_VERSION,
    parse: parseUrlShare,
    select: () => toUrlShare(text),
  });

  const fromText = (t: string, base = settings.base) => {
    setText(t);
    setParsed((p) => parse(t, base, p.model));
  };

  // Hydrate once from a share link or a hand-off.
  const handoff = useHandoff((p) => urlFromHandoff(p) !== null);
  const incoming = share.loaded ?? handoff;
  const [hydrated, setHydrated] = useState<unknown>(null);
  if (incoming && hydrated !== incoming) {
    // Adjusting state while rendering: runs once per new source.
    setHydrated(incoming);
    const url = share.loaded?.url ?? (handoff ? urlFromHandoff(handoff) : null);
    if (url) fromText(url);
  }

  const fromModel = (m: UrlModel) => {
    const url = buildUrl(m);
    setText(url);
    setParsed(parse(url, settings.base, m));
  };

  const model = parsed.model;
  const segments = useMemo(() => (model ? anatomy(model) : []), [model]);
  const secrets = useMemo(() => secretQueryKeys(text), [text]);

  const paste = async () => {
    try {
      fromText(await readClipboardText());
    } catch (e) {
      notify.error(toToolError(e, 'Could not read the clipboard'));
    }
  };

  const canSendHttp = !!model && /^https?:$/.test(model.protocol);
  const sendHttp = () =>
    model && sendTo(navigate, 'api-request', toHttpClient(model));
  const makeQr = () => sendTo(navigate, 'qr-code-generator', asUriList(text));
  const openEncoder = () =>
    sendTo(navigate, 'url-encoder-decoder', {
      kind: 'text',
      mime: 'text/plain',
      sourceTool: 'url-parser',
      text,
    });

  useSendCommands('url-parser', [
    { target: 'api-request', run: sendHttp, enabled: canSendHttp },
    { target: 'qr-code-generator', run: makeQr, enabled: !!model },
    { target: 'url-encoder-decoder', run: openEncoder, enabled: !!text },
  ]);

  useToolCommands('url-parser', [
    {
      id: 'copy',
      label: 'Copy URL',
      shortcut: 'Mod+Shift+C',
      run: () => void copy(text),
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => fromText(''),
    },
    { id: 'sample', label: 'Load sample', run: () => fromText(SAMPLE) },
    {
      id: 'share',
      label: 'Copy share link',
      shortcut: 'Mod+Shift+S',
      enabled: share.canShare && !!model,
      run: () => void share.share(),
    },
  ]);

  const openIn = (
    <Menu
      label="Open in"
      items={[
        {
          value: 'http',
          label: 'HTTP Client',
          icon: send,
          disabled: !canSendHttp,
        },
        {
          value: 'qr',
          label: 'QR Code Generator',
          icon: qrCode,
          disabled: !model,
        },
        {
          value: 'encoder',
          label: 'Text Encoder',
          icon: typeIcon,
          disabled: !text,
        },
      ]}
      onSelect={(v) =>
        v === 'http' ? sendHttp() : v === 'qr' ? makeQr() : openEncoder()
      }
      trigger={(props) => (
        <Button {...props} variant="soft" icon={send}>
          Open in
        </Button>
      )}
    />
  );

  const input = (
    <Card as="section" title="URL">
      <Stack gap="5">
        <TextArea
          label="URL"
          labelHidden
          rows={2}
          maxRows={6}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://example.com/path?query=value"
          value={text}
          onChange={(v) => fromText(v)}
          error={text && parsed.error ? parsed.error.message : undefined}
        />
        <Inline gap="2" align="center" wrap>
          <Button
            size="sm"
            variant="soft"
            icon={clipboardPaste}
            onClick={() => void paste()}
          >
            Paste
          </Button>
          {text ? (
            <>
              <CopyButton
                size="sm"
                value={text}
                labels={{ copy: 'Copy URL' }}
              />
              <IconButton
                size="sm"
                variant="ghost"
                tone="neutral"
                icon={close}
                label="Clear the URL"
                onClick={() => fromText('')}
              />
            </>
          ) : null}
        </Inline>
        {secrets.length > 0 ? (
          <Notice tone="warning" title="This URL may hold secrets">
            {`Query keys that look secret: ${secrets.join(', ')}. Check before sharing the link; any password in the user info is removed from shared links.`}
          </Notice>
        ) : null}
        {model ? (
          <Stack gap="3" as="section" aria-label="Anatomy">
            <AnatomyStrip segments={segments} />
          </Stack>
        ) : null}
        <Disclosure
          summary="Base URL for relative links"
          size="sm"
          defaultOpen={settings.base !== ''}
        >
          <TextField
            label="Base URL for relative input"
            description="Optional: resolves paths such as /docs/intro."
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://example.com/docs/"
            value={settings.base}
            onChange={(v) => {
              update({ base: v });
              setParsed((p) => parse(text, v, p.model));
            }}
          />
        </Disclosure>
      </Stack>
    </Card>
  );

  const output = model ? (
    <Card as="section" title="Inspect and edit">
      <Stack gap="5">
        <SegmentedControl
          label="URL sections"
          fullWidth
          value={tab}
          onChange={(v) => setTab(v as Section)}
          options={[
            { value: 'parts', label: 'Parts' },
            { value: 'params', label: `Query (${model.params.length})` },
            { value: 'domain', label: 'Domain' },
            { value: 'clean', label: 'Clean' },
          ]}
        />
        {tab === 'parts' ? (
          <PartsEditor model={model} onChange={fromModel} />
        ) : null}
        {tab === 'params' ? (
          <ParamsEditor
            rows={model.params}
            onChange={(params) => fromModel({ ...model, params })}
          />
        ) : null}
        {tab === 'domain' ? (
          <DomainPanel hostname={model.hostnamePunycode} />
        ) : null}
        {tab === 'clean' ? (
          <CleanPanel
            url={text}
            patterns={settings.tracking}
            onPatternsChange={(tracking) => update({ tracking })}
            onApply={(url) => fromText(url)}
          />
        ) : null}
      </Stack>
    </Card>
  ) : (
    <Card as="section" title="Inspect and edit">
      <EmptyState
        icon={link}
        title={text ? 'Nothing to inspect' : 'No URL yet'}
        description={
          text
            ? 'Fix the URL on the left: what is wrong is shown under it.'
            : 'Paste a URL to see its parts, query, domain and a clean link.'
        }
        actions={
          <Button
            variant="soft"
            icon={sparkles}
            onClick={() => fromText(SAMPLE)}
          >
            Try an example
          </Button>
        }
      />
    </Card>
  );

  return (
    <Stack gap="6">
      <ToolActions>
        {text ? openIn : null}
        <ShareButton share={share} />
      </ToolActions>
      <TransformLayout start={input} end={output} defaultSize={42} />
    </Stack>
  );
}
