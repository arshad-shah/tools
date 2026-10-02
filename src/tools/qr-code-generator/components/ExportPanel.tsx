import { useState } from 'react';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  Button,
  Inline,
  Label,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { IconCopy, IconDownload } from '@/shared/ui/icons';
import { printPixels, qrSvg, svgToPng, type QrStyle } from '../lib/render';
import type { QrSettings } from '../settings';

const PRESETS = [
  { value: '256', label: 'Small (256 px)' },
  { value: '512', label: 'Medium (512 px)' },
  { value: '1024', label: 'Large (1024 px)' },
  { value: '2048', label: 'Extra large (2048 px)' },
  { value: 'print', label: 'Print (300 dpi)' },
];

interface Props {
  value: string;
  qrStyle: QrStyle;
  settings: QrSettings;
  update(patch: Partial<QrSettings>): void;
  baseName: string;
  disabled: boolean;
}

/** PNG at a preset or print size, SVG, and Copy image. */
export function ExportPanel({
  value,
  qrStyle: style,
  settings: s,
  update,
  baseName,
  disabled,
}: Props) {
  const [busy, setBusy] = useState(false);
  const px =
    s.exportPreset === 'print'
      ? printPixels(s.printMm)
      : Number(s.exportPreset) || 1024;

  const run = async (what: string, f: () => Promise<void>) => {
    setBusy(true);
    try {
      await f();
    } catch (e) {
      notify.error(toToolError(e, `Could not ${what}`));
    } finally {
      setBusy(false);
    }
  };
  const png = async () => svgToPng(await qrSvg(value, style, px), px);

  return (
    <Stack gap="3">
      <Inline gap="3" align="end" wrap>
        <Stack gap="1">
          <Label htmlFor="qr-export-size">PNG size</Label>
          <Select
            id="qr-export-size"
            value={s.exportPreset}
            onValueChange={(exportPreset) => update({ exportPreset })}
            items={PRESETS}
          />
        </Stack>
        {s.exportPreset === 'print' && (
          <Stack gap="1">
            <Label htmlFor="qr-print-mm">Printed width (mm)</Label>
            <NumberInput
              id="qr-print-mm"
              value={s.printMm}
              min={10}
              max={500}
              onValueChange={(printMm) => update({ printMm: printMm || 30 })}
            />
          </Stack>
        )}
      </Inline>
      <Text size="xs" tone="muted">
        PNG is {px} by {px} pixels.
      </Text>
      <Inline gap="2" wrap>
        <Button
          variant="primary"
          leftIcon={<IconDownload size="sm" />}
          disabled={disabled || busy}
          onClick={() =>
            void run('make the PNG', async () =>
              saveBlob(await png(), deriveFilename(baseName, '', 'png')),
            )
          }
        >
          Download PNG
        </Button>
        <Button
          variant="secondary"
          leftIcon={<IconDownload size="sm" />}
          disabled={disabled || busy}
          onClick={() =>
            void run('make the SVG', async () =>
              saveBlob(
                new Blob([await qrSvg(value, style, 512)], {
                  type: 'image/svg+xml',
                }),
                deriveFilename(baseName, '', 'svg'),
              ),
            )
          }
        >
          Download SVG
        </Button>
        <Button
          variant="secondary"
          leftIcon={<IconCopy size="sm" />}
          disabled={disabled || busy || typeof ClipboardItem === 'undefined'}
          onClick={() =>
            void run('copy the image', async () => {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': png() }),
              ]);
              notify.success('QR code copied as an image');
            })
          }
        >
          Copy image
        </Button>
      </Inline>
    </Stack>
  );
}
