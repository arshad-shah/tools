import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  IconButton,
  Inline,
  Menu,
  SegmentedControl,
  Stack,
  StatusBar,
  StatusBarSegment,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import {
  clock,
  download,
  fileJson,
  hardDrive,
  key,
  link,
  send,
  split,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { formatBytes } from '@/shared/lib/format';
import { sendTo } from '@/shared/lib/handoff';
import { useMediaQuery } from '@/shared/lib/media-query';
import { useSendCommands } from '@/shared/lib/send-commands';
import type { Sent } from '../hooks/useHttpClient';
import {
  bodyView,
  findTokens,
  reasonPhrase,
  statusTone,
} from '../lib/response-view';
import { HexView, PrettyView, PreviewView, RawView } from './BodyViews';

type ResponseTab = 'pretty' | 'raw' | 'preview' | 'hex' | 'headers';

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
  const res = sent.response;
  const view = bodyView(res);
  const [tab, setTab] = useState<ResponseTab>('pretty');
  const tokens = findTokens(res);
  const t = sent.timing;
  const src = 'api-request';

  const canCompare = sent.previousText !== undefined && res.text !== undefined;
  const openJson = () =>
    sendTo(navigate, 'json-and-xml-viewer', {
      kind: 'text',
      mime: 'application/json',
      sourceTool: src,
      text: res.text ?? '',
    });
  const comparePrevious = () =>
    sendTo(navigate, 'text-diff-checker', {
      kind: 'text',
      mime: 'application/vnd.tools.diff-pair+json',
      sourceTool: src,
      text: JSON.stringify({ left: sent.previousText, right: res.text }),
      meta: { pair: true },
    });
  const decodeToken = () =>
    tokens[0] &&
    sendTo(navigate, 'jwt-decode', {
      kind: 'text',
      mime: 'application/jwt',
      sourceTool: src,
      text: tokens[0],
    });
  const inspectUrl = () =>
    sendTo(navigate, 'url-parser', {
      kind: 'text',
      mime: 'text/uri-list',
      sourceTool: src,
      text: sent.url,
    });

  useSendCommands(src, [
    { target: 'json-and-xml-viewer', run: openJson, enabled: view === 'json' },
    { target: 'text-diff-checker', run: comparePrevious, enabled: canCompare },
    { target: 'jwt-decode', run: decodeToken, enabled: !!tokens[0] },
    { target: 'url-parser', run: inspectUrl },
  ]);

  // Phones: the status bar's segments would be cut short.
  const phone = useMediaQuery('(max-width: 40rem)');
  const status = `${res.status} ${reasonPhrase(res.status, res.statusText)}`;
  const openIn = [
    ...(view === 'json'
      ? [{ value: 'json', label: 'Open in JSON Viewer', icon: fileJson }]
      : []),
    ...(canCompare
      ? [
          {
            value: 'compare',
            label: 'Compare with previous response',
            icon: split,
          },
        ]
      : []),
    ...(tokens[0]
      ? [{ value: 'token', label: 'Decode token', icon: key }]
      : []),
    { value: 'url', label: 'Inspect URL', icon: link },
  ];
  const actions = (
    <Inline gap="1" align="center">
      <CopyButton
        size="sm"
        value={res.text ?? ''}
        disabled={res.text === undefined}
        labels={{ copy: 'Copy body', copied: 'Body copied' }}
      />
      {res.size ? (
        <IconButton
          size="sm"
          variant="ghost"
          tone="neutral"
          icon={download}
          label="Download body"
          onClick={() =>
            saveBlob(
              res.bytes,
              deriveFilename('response', '', EXT[res.contentType] ?? 'bin'),
              res.contentType || 'application/octet-stream',
            )
          }
        />
      ) : null}
      <Menu
        label="Open the response in"
        items={openIn}
        onSelect={(v) =>
          v === 'json'
            ? openJson()
            : v === 'compare'
              ? comparePrevious()
              : v === 'token'
                ? decodeToken()
                : inspectUrl()
        }
        trigger={(props) => (
          <Button {...props} size="sm" variant="soft" icon={send}>
            Open in
          </Button>
        )}
      />
    </Inline>
  );

  return (
    <Card as="section" title="Response" actions={actions}>
      <Stack gap="5">
        {phone ? (
          <Inline gap="2" align="center" wrap>
            <Badge variant="solid" tone={TONE[statusTone(res.status)]}>
              {status}
            </Badge>
            <Text size="sm" tone="muted" numeric>
              {[`${sent.durationMs} ms`, formatBytes(res.size), res.contentType]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Inline>
        ) : (
          <StatusBar
            label="Response summary"
            start={
              <>
                <StatusBarSegment
                  tone={TONE[statusTone(res.status)]}
                  dot
                  dotTone={TONE[statusTone(res.status)]}
                  label="Status"
                >
                  {status}
                </StatusBarSegment>
                <StatusBarSegment icon={clock} label="Time" mono>
                  {`${sent.durationMs} ms`}
                </StatusBarSegment>
                <StatusBarSegment icon={hardDrive} label="Size" mono>
                  {formatBytes(res.size)}
                </StatusBarSegment>
              </>
            }
            end={
              res.contentType ? (
                <StatusBarSegment label="Content type" mono>
                  {res.contentType}
                </StatusBarSegment>
              ) : undefined
            }
          />
        )}
        {t ? (
          <Text size="sm" tone="muted" numeric>
            {`DNS ${t.dns} ms, connect ${t.connect} ms, TLS ${t.tls} ms, wait ${t.wait} ms, download ${t.download} ms`}
          </Text>
        ) : null}
        <SegmentedControl
          label="Response views"
          size="sm"
          fullWidth
          value={tab}
          onChange={(v) => setTab(v as ResponseTab)}
          options={[
            { value: 'pretty', label: 'Pretty' },
            { value: 'raw', label: 'Raw' },
            { value: 'preview', label: 'Preview' },
            { value: 'hex', label: 'Hex' },
            { value: 'headers', label: `Headers (${res.headers.length})` },
          ]}
        />
        {tab === 'pretty' ? <PrettyView res={res} view={view} /> : null}
        {tab === 'raw' ? <RawView res={res} /> : null}
        {tab === 'preview' ? <PreviewView res={res} view={view} /> : null}
        {tab === 'hex' ? <HexView res={res} /> : null}
        {tab === 'headers' ? (
          res.headers.length ? (
            <Table<[string, string]>
              caption="Response headers"
              captionHidden
              size="sm"
              rows={res.headers}
              getRowId={([k, v]) => `${k}:${v}`}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  rowHeader: true,
                  cell: ([k]) => <Text variant="code">{k}</Text>,
                },
                {
                  key: 'value',
                  header: 'Value',
                  cell: ([, v]) => (
                    <Text variant="code" wrap="break">
                      {v}
                    </Text>
                  ),
                },
              ]}
            />
          ) : (
            <EmptyState
              size="sm"
              title="No headers"
              description="The browser exposed no headers (cross-origin responses show only safe ones)."
            />
          )
        ) : null}
      </Stack>
    </Card>
  );
}
