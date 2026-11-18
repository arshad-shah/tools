import {
  Button,
  IconButton,
  Inline,
  Menu,
  SegmentedControl,
  Slider,
  Stack,
} from '@arshad-shah/cynosure';
import { copy, download, external } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTool } from '@/app/registry';
import { saveBlob } from '@/shared/lib/download';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { exportName, isLossy, type ExportFormat } from '../lib/export';

export const TOOL_ID = 'image-annotate';

const TARGETS = [
  { id: 'image-optimizer', label: 'Image Compressor' },
  { id: 'exif-tool', label: 'EXIF Viewer' },
];

export interface ExportPanelProps {
  format: ExportFormat;
  quality: number;
  onFormat(f: ExportFormat): void;
  onQuality(q: number): void;
  /** The source file's name (the export is named after it). */
  sourceName: string;
  /** Encodes the edited image in a format. */
  encode(format: ExportFormat): Promise<Blob>;
  disabled?: boolean;
}

/** Save as PNG, JPEG or WebP, copy to the clipboard, or open in a tool. */
export function ExportPanel({
  format,
  quality,
  onFormat,
  onQuality,
  sourceName,
  encode,
  disabled,
}: ExportPanelProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify.error(toToolError(e, `Could not ${what}`));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run('save the image', async () => {
      saveBlob(await encode(format), exportName(sourceName, format));
    });

  const canCopy =
    typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  const copyImage = () =>
    run('copy the image', async () => {
      try {
        // Clipboards take PNG everywhere; the promise keeps the user gesture.
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': encode('png') }),
        ]);
      } catch (cause) {
        throw cause instanceof ToolError
          ? cause
          : new ToolError('UNKNOWN', 'Could not copy the image', { cause });
      }
      notify.success('Image copied');
    });

  const targets = TARGETS.filter((t) => getTool(t.id)?.enabled);
  const open = (id: string) =>
    run('open the image', async () => {
      const blob = await encode(format);
      const file = new File([blob], exportName(sourceName, format), {
        type: blob.type,
      });
      sendTo(navigate, id, {
        kind: 'files',
        files: [file],
        sourceTool: TOOL_ID,
      });
    });

  useSendCommands(
    TOOL_ID,
    targets.map((t) => ({
      target: t.id,
      enabled: !disabled,
      run: () => void open(t.id),
    })),
  );
  useToolCommands(TOOL_ID, [
    {
      id: 'download',
      label: 'Download the edited image',
      shortcut: 'Mod+S',
      enabled: !disabled,
      run: () => void save(),
    },
    {
      id: 'copy-image',
      label: 'Copy the edited image',
      shortcut: 'Mod+Shift+C',
      enabled: !disabled && canCopy,
      run: () => void copyImage(),
    },
  ]);

  return (
    <Stack gap="4">
      <SegmentedControl
        label="Format"
        fullWidth
        value={format}
        onChange={(v) => onFormat(v as ExportFormat)}
        options={[
          { value: 'png', label: 'PNG' },
          { value: 'jpeg', label: 'JPEG' },
          { value: 'webp', label: 'WebP' },
        ]}
      />
      {isLossy(format) ? (
        <Slider
          label="Quality"
          min={10}
          max={100}
          step={5}
          showValue
          value={Math.round(quality * 100)}
          onChange={(v) =>
            onQuality((Array.isArray(v) ? v[0] : (v as number)) / 100)
          }
          labels={{ value: (v) => `${v}%` }}
        />
      ) : null}
      <Inline gap="2" align="center" wrap>
        <Button
          variant="solid"
          tone="accent"
          icon={download}
          disabled={disabled || busy}
          onClick={() => void save()}
        >
          Download
        </Button>
        {canCopy ? (
          <IconButton
            variant="soft"
            tone="neutral"
            icon={copy}
            label="Copy image"
            disabled={disabled || busy}
            onClick={() => void copyImage()}
          />
        ) : null}
        {targets.length ? (
          <Menu
            label="Open in"
            items={targets.map((t) => ({ value: t.id, label: t.label }))}
            onSelect={(id) => void open(id)}
            trigger={(props) => (
              <Button
                {...props}
                variant="ghost"
                icon={external}
                disabled={disabled || busy}
              >
                Open in
              </Button>
            )}
          />
        ) : null}
      </Inline>
    </Stack>
  );
}
