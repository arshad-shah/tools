import {
  Button,
  Card,
  FileDrop,
  Inline,
  Notice,
  ProgressBar,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { plus, qrCode } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatColor } from '@/shared/lib/colour';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useJob } from '@/shared/state/useJob';
import { imageClient } from '@/shared/workers/image-client';
import { COLORS_MIME, qrColours } from '../lib/qr-colours';
import { type CvdMode } from '../lib/harmonies';
import { SwatchSet } from './SwatchSet';

export interface ExtractPanelProps {
  /** Adds hex colours to the working palette. */
  onAdd(colors: string[]): void;
  /** Makes a colour the base colour. */
  onUse(hex: string): void;
  cvd: CvdMode;
}

const ACCEPT = 'image/png,image/jpeg,image/webp';

/** A palette from an image (seeded OKLab k-means in the image worker). */
export function ExtractPanel({ onAdd, onUse, cvd }: ExtractPanelProps) {
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
    <Card as="section" title="Palette from an image">
      <Stack gap="5">
        <FileDrop
          onFiles={take}
          accept={ACCEPT}
          multiple={false}
          size="sm"
          hint="PNG, JPEG or WebP. Read on this device only."
          labels={{
            prompt: 'Drop an image to extract its palette',
            chooseOne: 'Choose image',
          }}
        />
        <Slider
          label={`Colours: ${k}`}
          min={3}
          max={12}
          value={k}
          onChange={(v) => {
            const n = v as number;
            setK(n);
            if (file) void job.run(file, n);
          }}
        />
        {file ? (
          <Text size="sm" tone="muted" truncate>
            {file.name}
          </Text>
        ) : null}
        {job.status === 'running' ? (
          <ProgressBar label="Extracting colours" indeterminate />
        ) : null}
        {job.status === 'error' && job.error ? (
          <Notice tone="danger">{job.error.message}</Notice>
        ) : null}
        {entries.length > 0 ? (
          <Stack gap="4">
            <SwatchSet
              label="Extracted colours"
              colors={hexes}
              names={entries.map(
                (e, i) => `${hexes[i]}, ${Math.round(e.share * 100)}%`,
              )}
              cvd={cvd}
              onUse={onUse}
            />
            <Inline gap="2" align="center" wrap>
              <Button
                size="sm"
                variant="soft"
                icon={plus}
                onClick={() => {
                  onAdd(hexes);
                  notify.success(
                    `Added ${hexes.length} colours to the palette`,
                  );
                }}
              >
                Add to palette
              </Button>
              <Button
                size="sm"
                variant="soft"
                icon={qrCode}
                disabled={!qr}
                onClick={toQr}
              >
                Use colours in QR
              </Button>
            </Inline>
            {!qr ? (
              <Text size="sm" tone="muted">
                The darkest and lightest colours contrast less than 4 to 1, too
                low for a scannable QR code.
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
