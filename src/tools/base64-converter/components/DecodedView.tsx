import {
  Badge,
  Button,
  CodeBlock,
  DescriptionList,
  Grid,
  Image,
  Inline,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { SendToMenu } from '@/app/ui/transform';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { formatBytes } from '@/shared/lib/format';
import { useObjectUrl } from '@/shared/lib/object-url';
import { formatRow } from '@/shared/ui/bytes-view-format';
import type { BytesInsight } from '../lib/insight';
import { sendTargets } from '../lib/send-targets';

type View = 'text' | 'hex' | 'binary';

export interface DecodedFile {
  bytes: Uint8Array;
  mime: string;
  ext: string;
}

interface DecodedViewProps {
  file: DecodedFile;
  /** The decoded UTF-8 text, or null for binary data. */
  text: string | null;
  insight: BytesInsight;
}

/** How many bytes the hex and binary dumps show. */
const DUMP_BYTES = 4096;

/** Hex or binary dump rows (offset, bytes, ASCII) of the first bytes. */
function dump(bytes: Uint8Array, mode: 'hex' | 'binary'): string {
  const perRow = mode === 'hex' ? 16 : 6;
  const shown = Math.min(bytes.length, DUMP_BYTES);
  const rows: string[] = [];
  for (let r = 0; r * perRow < shown; r++)
    rows.push(formatRow(bytes, r, mode, perRow).text.trimEnd());
  return rows.join('\n');
}

/** Decoded output: what it looks like, the text or bytes, a preview, Download and Send to. */
export const DecodedView: React.FC<DecodedViewProps> = ({
  file,
  text,
  insight,
}) => {
  const [view, setView] = useState<View>(text === null ? 'hex' : 'text');
  const shown: View = text === null && view === 'text' ? 'hex' : view;
  const canSend = sendTargets(insight).length > 0;
  const image = insight.kind === 'image';
  const src = useObjectUrl(
    image ? file.bytes : null,
    insight.mime ?? file.mime,
  );

  const payload = (): HandoffPayload | null => {
    if (insight.kind === 'json' && text !== null)
      return {
        kind: 'text',
        mime: 'application/json',
        text,
        sourceTool: 'base64-converter',
      };
    if (insight.kind === 'jwt' && text !== null)
      return {
        kind: 'text',
        mime: 'application/jwt',
        text: text.trim(),
        sourceTool: 'base64-converter',
      };
    if (image)
      return {
        kind: 'files',
        files: [
          new File(
            [file.bytes as Uint8Array<ArrayBuffer>],
            deriveFilename('decoded', '', file.ext),
            { type: file.mime },
          ),
        ],
        sourceTool: 'base64-converter',
      };
    return null;
  };

  return (
    <Stack gap="5">
      <DescriptionList
        size="sm"
        divided
        items={[
          {
            id: 'kind',
            term: 'Looks like',
            detail: (
              <Badge tone="accent" size="sm">
                {insight.label}
              </Badge>
            ),
          },
          {
            id: 'details',
            term: 'Details',
            detail:
              text === null
                ? `Binary data (${formatBytes(file.bytes.length)}, ${file.mime})`
                : (insight.details ?? `${formatBytes(file.bytes.length)}`),
          },
        ]}
      />
      <Inline gap="2" wrap>
        <Button
          size="sm"
          variant="soft"
          icon={download}
          onClick={() =>
            saveBlob(
              file.bytes,
              deriveFilename('decoded', '', file.ext),
              file.mime,
            )
          }
        >
          Download file
        </Button>
        {canSend ? (
          <SendToMenu payload={payload} sourceTool="base64-converter" />
        ) : null}
      </Inline>
      {image && src ? (
        <Grid columns={{ base: 1, sm: 2 }}>
          <Image
            src={src}
            alt={`Decoded ${insight.label}`}
            fit="contain"
            ratio="4/3"
            radius="md"
            loading="eager"
          />
        </Grid>
      ) : null}
      <SegmentedControl
        label="Show the decoded data as"
        size="sm"
        value={shown}
        onChange={(v) => setView(v as View)}
        options={[
          { value: 'text', label: 'Text', disabled: text === null },
          { value: 'hex', label: 'Hex' },
          { value: 'binary', label: 'Binary' },
        ]}
      />
      {shown === 'text' && text !== null ? (
        <CodeBlock
          title="Decoded text"
          code={text}
          language={insight.kind === 'json' ? 'json' : undefined}
          wrap
          actions={
            <Button
              size="sm"
              variant="ghost"
              icon={download}
              onClick={() =>
                saveBlob(
                  new Blob([text], { type: 'text/plain' }),
                  deriveFilename('decoded', '', 'txt'),
                )
              }
            >
              Download
            </Button>
          }
        />
      ) : (
        <Stack gap="2">
          <CodeBlock
            title="Decoded bytes"
            code={dump(file.bytes, shown === 'binary' ? 'binary' : 'hex')}
            size="sm"
          />
          {file.bytes.length > DUMP_BYTES ? (
            <Text size="sm" tone="muted">
              {`Showing the first ${formatBytes(DUMP_BYTES)} of ${formatBytes(file.bytes.length)}. Download file saves all of it.`}
            </Text>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
};
