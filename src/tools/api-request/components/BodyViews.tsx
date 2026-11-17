import {
  CodeBlock,
  HtmlPreview,
  Image,
  Stack,
  Text,
  Tree,
} from '@arshad-shah/cynosure';
import { useEffect, useMemo, useState } from 'react';
import { prettyXml } from '@/shared/lib/data-formats/xml';
import { formatBytes } from '@/shared/lib/format';
import type { HttpResponse } from '../lib/http';
import { HEX_LIMIT, hexDump } from '../lib/hex';
import { jsonItems } from '../lib/json-items';
import type { BodyView } from '../lib/response-view';

/** Text shown at once (CodeBlock draws all of it: gaps doc). */
const TEXT_LIMIT = 256 * 1024;

const clip = (text: string) =>
  text.length > TEXT_LIMIT ? text.slice(0, TEXT_LIMIT) : text;

function Clipped({ total }: { total: number }) {
  return total > TEXT_LIMIT ? (
    <Text size="sm" tone="muted">
      {`Showing the first ${formatBytes(TEXT_LIMIT)}; Copy and Download take all of it.`}
    </Text>
  ) : null;
}

function JsonTree({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState<string[]>(['$']);
  const items = useMemo(
    () => [jsonItems('response', value, '$', new Set(expanded))],
    [value, expanded],
  );
  return (
    <Tree<string>
      label="Response JSON"
      items={items}
      expanded={expanded}
      onExpandedChange={setExpanded}
      size="sm"
      renderLabel={(item, label) => (
        <>
          {label}
          <Text as="span" variant="code" tone="muted">
            {` ${item.data ?? ''}`}
          </Text>
        </>
      )}
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
    <Stack gap="2">
      <CodeBlock
        title="Response body"
        code={clip(pretty)}
        language={view === 'xml' || view === 'html' ? 'xml' : undefined}
        wrap
        copyable={false}
      />
      <Clipped total={pretty.length} />
    </Stack>
  );
}

export function RawView({ res }: { res: HttpResponse }) {
  if (res.text === undefined)
    return <Text tone="muted">Binary body: see Hex.</Text>;
  return (
    <Stack gap="2">
      <CodeBlock
        title="Raw response body"
        code={clip(res.text)}
        wrap
        copyable={false}
      />
      <Clipped total={res.text.length} />
    </Stack>
  );
}

/** The response image as an object URL for Image, revoked when replaced. */
function ResponseImage({ res }: { res: HttpResponse }) {
  const src = useMemo(
    () =>
      URL.createObjectURL(
        new Blob([res.bytes as BlobPart], { type: res.contentType }),
      ),
    [res],
  );
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  return <Image src={src} alt="Response image" fit="contain" radius="md" />;
}

/** Images through Image; HTML in a sandbox with remote loads blocked. */
export function PreviewView({
  res,
  view,
}: {
  res: HttpResponse;
  view: BodyView;
}) {
  if (view === 'image') return <ResponseImage res={res} />;
  if (view === 'html' && res.text !== undefined)
    return (
      <HtmlPreview label="Response preview" html={res.text} ratio={4 / 3} />
    );
  return <Text tone="muted">No preview for this content type.</Text>;
}

export function HexView({ res }: { res: HttpResponse }) {
  if (!res.size) return <Text tone="muted">Empty body.</Text>;
  return (
    <Stack gap="2">
      <CodeBlock
        title="Response bytes"
        code={hexDump(res.bytes)}
        copyable={false}
      />
      {res.size > HEX_LIMIT ? (
        <Text size="sm" tone="muted">
          {`Showing the first ${formatBytes(HEX_LIMIT)} of ${formatBytes(res.size)}; Download takes all of it.`}
        </Text>
      ) : null}
    </Stack>
  );
}
