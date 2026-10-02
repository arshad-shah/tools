import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readClipboardText, useClipboard } from '@/shared/lib/clipboard';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { sendTo, useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Input,
  Label,
  ShareButton,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import {
  IconCheck,
  IconClipboard,
  IconCopy,
  IconQrCode,
  IconSend,
  IconType,
} from '@/shared/ui/icons';
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

export default function UrlInspector() {
  const navigate = useNavigate();
  const [settings, update] = urlSettings.useSettings();
  const [text, setText] = useState(SAMPLE);
  const [parsed, setParsed] = useState<Parsed>(() => parse(SAMPLE, '', null));
  const { copiedKey, copy } = useClipboard();
  const [tab, setTab] = useState('parts');

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
      run: () => void copy(text, 'url'),
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

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Stack gap="3">
            <Label htmlFor="url-input">URL</Label>
            <Input
              id="url-input"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={text}
              onChange={(v) => fromText(v)}
              invalid={!!parsed.error}
              spellCheck={false}
              className="font-mono"
              placeholder="https://example.com/path?query=value"
              aria-describedby={parsed.error ? 'url-error' : undefined}
            />
            {parsed.error && (
              <Alert status="danger" id="url-error">
                <AlertDescription>{parsed.error.message}</AlertDescription>
              </Alert>
            )}
            <Stack gap="1">
              <Label htmlFor="url-base">
                Base URL for relative input (optional)
              </Label>
              <Input
                id="url-base"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={settings.base}
                onChange={(v) => {
                  update({ base: v });
                  setParsed((p) => parse(text, v, p.model));
                }}
                spellCheck={false}
                placeholder="https://example.com/docs/"
              />
            </Stack>
            <Inline gap="2" wrap>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconClipboard size="sm" />}
                onClick={() => void paste()}
              >
                Paste
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={
                  copiedKey === 'url' ? (
                    <IconCheck size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={() => void copy(text, 'url')}
                disabled={!text}
              >
                Copy URL
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconSend size="sm" />}
                disabled={!canSendHttp}
                onClick={sendHttp}
              >
                Send to HTTP Client
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconQrCode size="sm" />}
                disabled={!model}
                onClick={makeQr}
              >
                Make QR
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconType size="sm" />}
                disabled={!text}
                onClick={openEncoder}
              >
                Open in Text Encoder
              </Button>
              <ShareButton share={share} label="Share link" size="sm" />
            </Inline>
            {secrets.length > 0 && (
              <Alert status="warning">
                <AlertTitle>This URL may hold secrets</AlertTitle>
                <AlertDescription>
                  Query keys that look secret: {secrets.join(', ')}. Check
                  before sharing the link; any password in the user info is
                  removed from shared links.
                </AlertDescription>
              </Alert>
            )}
          </Stack>
        </CardBody>
      </Card>

      {model && (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Anatomy</CardTitle>
            </CardHeader>
            <CardBody>
              <AnatomyStrip segments={segments} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Tabs value={tab} onValueChange={setTab} variant="soft">
                <TabsList aria-label="URL sections">
                  <TabsTrigger value="parts">Parts</TabsTrigger>
                  <TabsTrigger value="params">
                    Query ({model.params.length})
                  </TabsTrigger>
                  <TabsTrigger value="domain">Domain</TabsTrigger>
                  <TabsTrigger value="clean">Clean URL</TabsTrigger>
                </TabsList>
                <TabsContent value="parts">
                  <PartsEditor model={model} onChange={fromModel} />
                </TabsContent>
                <TabsContent value="params">
                  <ParamsEditor
                    rows={model.params}
                    onChange={(params) => fromModel({ ...model, params })}
                  />
                </TabsContent>
                <TabsContent value="domain">
                  <DomainPanel hostname={model.hostnamePunycode} />
                </TabsContent>
                <TabsContent value="clean">
                  <CleanPanel
                    url={text}
                    patterns={settings.tracking}
                    onPatternsChange={(tracking) => update({ tracking })}
                    onApply={(url) => fromText(url)}
                  />
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </>
      )}
    </Stack>
  );
}
