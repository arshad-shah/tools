import { useMemo, useState } from 'react';
import { prettyXml } from '@/shared/lib/data-formats/xml';
import {
  Alert,
  AlertDescription,
  Button,
  BytesView,
  CodeTree,
  Image,
  SandboxedHtml,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import type { HttpResponse } from '../lib/http';
import { jsonNode } from '../lib/json-tree';
import type { BodyView } from '../lib/response-view';

function JsonTree({ value }: { value: unknown }) {
  const roots = useMemo(() => [jsonNode('response', value, '$')], [value]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <CodeTree
      roots={roots}
      expanded={expanded}
      onExpandedChange={setExpanded}
      selectedId={selected}
      onSelect={setSelected}
      ariaLabel="Response JSON"
      height={420}
    />
  );
}

/** Pretty: a JSON tree, indented XML or the text. */
export function PrettyView({
  res,
  view,
}: {
  res: HttpResponse;
  view: BodyView;
}) {
  const pretty = useMemo(() => {
    if (view !== 'xml' || res.text === undefined) return res.text ?? '';
    try {
      return prettyXml(res.text);
    } catch {
      return res.text;
    }
  }, [res.text, view]);
  if (view === 'json') return <JsonTree value={res.json} />;
  if (view === 'empty') return <Text tone="muted">Empty body.</Text>;
  if (view === 'binary' || view === 'image')
    return <Text tone="muted">Binary body: see Preview or Hex.</Text>;
  return (
    <TextInputPanel
      label="Response body"
      language={view === 'xml' || view === 'html' ? 'xml' : 'plain'}
      value={pretty}
      onChange={() => {}}
      readOnly
      wrap
      maxHeight={480}
    />
  );
}

export function RawView({ res }: { res: HttpResponse }) {
  if (res.text === undefined)
    return <Text tone="muted">Binary body: see Hex.</Text>;
  return (
    <TextInputPanel
      label="Raw response body"
      language="plain"
      value={res.text}
      onChange={() => {}}
      readOnly
      wrap
      maxHeight={480}
    />
  );
}

/** Images through the kit Image; HTML in a sandbox with remote loads blocked. */
export function PreviewView({
  res,
  view,
}: {
  res: HttpResponse;
  view: BodyView;
}) {
  const [remote, setRemote] = useState(false);
  if (view === 'image')
    return (
      <Image
        src={res.bytes}
        mime={res.contentType}
        alt="Response image"
        fit="contain"
        className="max-h-120"
      />
    );
  if (view === 'html' && res.text !== undefined)
    return (
      <Stack gap="2">
        {!remote && (
          <Alert status="info" size="sm">
            <AlertDescription>
              Remote images and styles are blocked.{' '}
              <Button size="sm" variant="ghost" onClick={() => setRemote(true)}>
                Load remote images
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <SandboxedHtml
          html={res.text}
          title="Response preview"
          allowRemoteImages={remote}
          className="h-120"
        />
      </Stack>
    );
  return <Text tone="muted">No preview for this content type.</Text>;
}

export function HexView({ res }: { res: HttpResponse }) {
  if (!res.size) return <Text tone="muted">Empty body.</Text>;
  return (
    <BytesView bytes={res.bytes} ariaLabel="Response bytes" maxHeight={480} />
  );
}
