import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatColor } from '@/shared/lib/colour';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useJob } from '@/shared/state/useJob';
import { imageClient } from '@/shared/workers/image-client';
import { IconPlus, IconQrCode } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  DropZone,
  Inline,
  Label,
  Slider,
  Spinner,
  Stack,
  Swatch,
  Text,
} from '@/shared/ui';
import { COLORS_MIME, qrColours } from '../lib/qr-colours';
import { viewAs, type CvdMode } from '../lib/harmonies';

export interface ExtractPanelProps {
  /** Adds hex colours to the working palette. */
  onAdd(colors: string[]): void;
  cvd: CvdMode;
}

const ACCEPT = 'image/png,image/jpeg,image/webp';

/** A palette from an image (seeded OKLab k-means in the image worker). */
export function ExtractPanel({ onAdd, cvd }: ExtractPanelProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [k, setK] = useState(6);
  const job = useJob((ctx, f: File, n: number) =>
    imageClient().call('extractPalette', [f, n], { signal: ctx.signal }),
  );

  const take = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    void job.run(f, k);
  };
  useHandoffFiles(take);

  const entries = job.result ?? [];
  const hexes = entries.map((e) => formatColor(e.color, 'hex'));
  const qr = entries.length ? qrColours(entries.map((e) => e.color)) : null;

  const toQr = () => {
    if (!qr) return;
    sendTo(navigate, 'qr-code-generator', {
      kind: 'text',
      mime: COLORS_MIME,
      text: JSON.stringify(qr),
      sourceTool: 'color-tester',
    });
  };
  useSendCommands('color-tester', [
    { target: 'qr-code-generator', run: toQr, enabled: !!qr },
  ]);

  return (
    <Stack gap="4">
      <DropZone
        variant="inline"
        onFiles={take}
        accept={ACCEPT}
        multiple={false}
        title="Drop an image to extract its palette"
        hint="PNG, JPEG or WebP. Read on this device only."
        chooseLabel="Choose image"
      />
      <Stack gap="1">
        <Label htmlFor="color-extract-k">{`Colours: ${k}`}</Label>
        <Slider
          id="color-extract-k"
          min={3}
          max={12}
          value={k}
          onValueChange={(n) => {
            setK(n);
            if (file) void job.run(file, n);
          }}
        />
      </Stack>
      {file && (
        <Text size="sm" tone="muted">
          {file.name}
        </Text>
      )}
      {job.status === 'running' && (
        <Inline gap="2" align="center">
          <Spinner size="sm" />
          <Text size="sm">Extracting colours</Text>
        </Inline>
      )}
      {job.status === 'error' && job.error && (
        <Alert status="danger">
          <AlertDescription>{job.error.message}</AlertDescription>
        </Alert>
      )}
      {entries.length > 0 && (
        <Stack gap="3">
          <Inline gap="3" role="list" aria-label="Extracted colours">
            {entries.map((e, i) => (
              <Inline key={hexes[i]} gap="1" align="center" role="listitem">
                <Swatch
                  color={viewAs(e.color, cvd)}
                  label={`${hexes[i]}, ${Math.round(e.share * 100)}%`}
                  size="lg"
                />
                <Text as="span" size="xs" mono>
                  {`${hexes[i]} ${Math.round(e.share * 100)}%`}
                </Text>
              </Inline>
            ))}
          </Inline>
          <Inline gap="2" align="center">
            <Button
              size="sm"
              leftIcon={<IconPlus size="sm" />}
              onClick={() => {
                onAdd(hexes);
                notify.success(`Added ${hexes.length} colours to the palette`);
              }}
            >
              Add to palette
            </Button>
            <Button
              size="sm"
              leftIcon={<IconQrCode size="sm" />}
              disabled={!qr}
              onClick={toQr}
            >
              Use colours in QR
            </Button>
            {!qr && (
              <Text size="xs" tone="muted">
                The darkest and lightest colours contrast less than 4 to 1, too
                low for a scannable QR code.
              </Text>
            )}
          </Inline>
        </Stack>
      )}
    </Stack>
  );
}
