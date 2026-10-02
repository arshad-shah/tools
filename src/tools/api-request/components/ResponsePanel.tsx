import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { formatBytes } from '@/shared/lib/format';
import { sendTo } from '@/shared/lib/handoff';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Inline,
  MetaList,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import {
  IconCopy,
  IconDownload,
  IconFileJson,
  IconKey,
  IconLink,
  IconSplit,
} from '@/shared/ui/icons';
import type { Sent } from '../hooks/useHttpClient';
import {
  bodyView,
  findTokens,
  reasonPhrase,
  statusTone,
} from '../lib/response-view';
import { HexView, PrettyView, PreviewView, RawView } from './BodyViews';

const TONE = {
  ok: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
} as const;

const EXT: Record<string, string> = {
  'application/json': 'json',
  'text/html': 'html',
  'text/plain': 'txt',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

/** Status, timing, size, headers and the body views, with hand-offs. */
export function ResponsePanel({ sent }: { sent: Sent }) {
  const navigate = useNavigate();
  const { copiedKey, copy } = useClipboard();
  const res = sent.response;
  const view = bodyView(res);
  const [tab, setTab] = useState('pretty');
  const tokens = findTokens(res);
  const t = sent.timing;
  const src = 'api-request';

  return (
    <Card>
      <CardHeader>
        <Inline gap="3" align="center" wrap>
          <Badge variant="solid" tone={TONE[statusTone(res.status)]} size="md">
            {res.status} {reasonPhrase(res.status, res.statusText)}
          </Badge>
          <MetaList
            items={[
              <span key="t">{sent.durationMs} ms</span>,
              <span key="s">{formatBytes(res.size)}</span>,
              res.contentType ? <span key="c">{res.contentType}</span> : null,
              t ? (
                <span key="b">
                  DNS {t.dns} ms, connect {t.connect} ms, TLS {t.tls} ms, wait{' '}
                  {t.wait} ms, download {t.download} ms
                </span>
              ) : null,
            ].filter(Boolean)}
          />
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconCopy size="sm" />}
              disabled={res.text === undefined}
              onClick={() => void copy(res.text ?? '', 'body')}
            >
              {copiedKey === 'body' ? 'Copied' : 'Copy body'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconDownload size="sm" />}
              disabled={!res.size}
              onClick={() =>
                saveBlob(
                  res.bytes,
                  `response.${EXT[res.contentType] ?? 'bin'}`,
                  res.contentType || 'application/octet-stream',
                )
              }
            >
              Download body
            </Button>
            {view === 'json' && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconFileJson size="sm" />}
                onClick={() =>
                  sendTo(navigate, 'json-and-xml-viewer', {
                    kind: 'text',
                    mime: 'application/json',
                    sourceTool: src,
                    text: res.text ?? '',
                  })
                }
              >
                Open in JSON Viewer
              </Button>
            )}
            {sent.previousText !== undefined && res.text !== undefined && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconSplit size="sm" />}
                onClick={() =>
                  sendTo(navigate, 'text-diff-checker', {
                    kind: 'text',
                    mime: 'application/vnd.tools.diff-pair+json',
                    sourceTool: src,
                    text: JSON.stringify({
                      left: sent.previousText,
                      right: res.text,
                    }),
                    meta: { pair: true },
                  })
                }
              >
                Compare with previous response
              </Button>
            )}
            {tokens[0] && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconKey size="sm" />}
                onClick={() =>
                  sendTo(navigate, 'jwt-decode', {
                    kind: 'text',
                    mime: 'application/jwt',
                    sourceTool: src,
                    text: tokens[0],
                  })
                }
              >
                Decode token
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconLink size="sm" />}
              onClick={() =>
                sendTo(navigate, 'url-parser', {
                  kind: 'text',
                  mime: 'text/uri-list',
                  sourceTool: src,
                  text: sent.url,
                })
              }
            >
              Inspect URL
            </Button>
          </Inline>
          <Tabs value={tab} onValueChange={setTab} variant="soft">
            <TabsList aria-label="Response views">
              <TabsTrigger value="pretty">Pretty</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="hex">Hex</TabsTrigger>
              <TabsTrigger value="headers">
                Headers ({res.headers.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pretty">
              <PrettyView res={res} view={view} />
            </TabsContent>
            <TabsContent value="raw">
              <RawView res={res} />
            </TabsContent>
            <TabsContent value="preview">
              <PreviewView res={res} view={view} />
            </TabsContent>
            <TabsContent value="hex">
              <HexView res={res} />
            </TabsContent>
            <TabsContent value="headers">
              {res.headers.length ? (
                <Table aria-label="Response headers">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.headers.map(([k, v], i) => (
                      <TableRow key={`${k}-${i}`}>
                        <TableCell className="font-mono">{k}</TableCell>
                        <TableCell className="font-mono break-all">
                          {v}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Text tone="muted">
                  The browser exposed no headers (cross-origin responses show
                  only safe ones).
                </Text>
              )}
            </TabsContent>
          </Tabs>
        </Stack>
      </CardBody>
    </Card>
  );
}
