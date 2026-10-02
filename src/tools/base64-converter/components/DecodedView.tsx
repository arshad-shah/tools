import React, { useState } from 'react';
import { IconDownload } from '@/shared/ui/icons';
import {
  Badge,
  BytesView,
  Button,
  Image,
  Inline,
  SegmentedControl,
  SendToMenu,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import { saveBlob } from '@/shared/lib/download';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { formatBytes } from '@/shared/lib/format';
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

/** Decoded output: insight, text or byte views, preview, download, Send to. */
export const DecodedView: React.FC<DecodedViewProps> = ({
  file,
  text,
  insight,
}) => {
  const [view, setView] = useState<View>(text === null ? 'hex' : 'text');
  const shown: View = text === null && view === 'text' ? 'hex' : view;
  const canSend = sendTargets(insight).length > 0;

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
    if (insight.kind === 'image')
      return {
        kind: 'files',
        files: [
          new File(
            [file.bytes as Uint8Array<ArrayBuffer>],
            `decoded.${file.ext}`,
            {
              type: file.mime,
            },
          ),
        ],
        sourceTool: 'base64-converter',
      };
    return null;
  };

  return (
    <Stack gap="3">
      <Inline justify="between" align="center" wrap gap="2">
        <Inline gap="2" align="center" wrap>
          <Text size="sm" weight="semibold">
            Looks like:
          </Text>
          <Badge variant="soft" tone="accent" size="sm">
            {insight.label}
          </Badge>
          <Text size="sm" tone="subtle">
            {text === null
              ? `Binary data (${formatBytes(file.bytes.length)}, ${file.mime})`
              : insight.details}
          </Text>
        </Inline>
        <Inline gap="2" align="center">
          {canSend && (
            <SendToMenu
              payload={payload}
              sourceTool="base64-converter"
              size="sm"
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconDownload size="sm" />}
            onClick={() =>
              saveBlob(file.bytes, `decoded.${file.ext}`, file.mime)
            }
          >
            Download file
          </Button>
        </Inline>
      </Inline>
      <SegmentedControl<View>
        label="Show the decoded data as"
        value={shown}
        onChange={setView}
        size="sm"
        options={[
          { value: 'text', label: 'Text', disabled: text === null },
          { value: 'hex', label: 'Hex' },
          { value: 'binary', label: 'Binary' },
        ]}
      />
      {shown === 'text' && text !== null ? (
        <TextInputPanel
          label="Result"
          value={text}
          onChange={() => {}}
          language={insight.kind === 'json' ? 'json' : 'plain'}
          readOnly
          downloadName="decoded.txt"
          wrap
          maxHeight={420}
        />
      ) : (
        <BytesView
          bytes={file.bytes}
          mode={shown === 'binary' ? 'binary' : 'hex'}
          ariaLabel="Decoded bytes"
          maxHeight={420}
        />
      )}
      {insight.kind === 'image' && (
        <div className="max-w-sm">
          <Image
            src={file.bytes}
            mime={insight.mime ?? file.mime}
            alt={`Decoded ${insight.label}`}
            fit="contain"
            data-testid="base64-preview"
          />
        </div>
      )}
    </Stack>
  );
};
