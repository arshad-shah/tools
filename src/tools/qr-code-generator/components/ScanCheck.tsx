import { useEffect, useState } from 'react';
import { decodeBarcodes } from '@/shared/lib/qr-decode';
import { Alert, AlertDescription, AlertTitle, Stack } from '@/shared/ui';
import { qrSvg, svgToPng, type QrStyle } from '../lib/render';
import { assessScannability } from '../lib/scannability';

type Check = { key: string; ok: boolean; reason?: string };

/**
 * Scannability warnings plus a real self-test: the code is rendered to an
 * image and read back with the scanner's decoder.
 */
export function ScanCheck({
  value,
  qrStyle: style,
}: {
  value: string;
  qrStyle: QrStyle;
}) {
  const key = JSON.stringify([value, style]);
  const [check, setCheck] = useState<Check | null>(null);
  const { warnings } = assessScannability(style);

  useEffect(() => {
    if (!value) return;
    let live = true;
    const t = window.setTimeout(() => {
      qrSvg(value, style, 512)
        .then((svg) => svgToPng(svg, 512))
        .then((png) => decodeBarcodes(png, { formats: ['qr_code'] }))
        .then(
          (found) => {
            if (!live) return;
            const hit = found.some((f) => f.text === value);
            setCheck({
              key,
              ok: hit,
              reason: hit
                ? undefined
                : found.length
                  ? 'it reads as different text'
                  : 'no code was found in the rendered image',
            });
          },
          (e: unknown) =>
            live &&
            setCheck({
              key,
              ok: false,
              reason: e instanceof Error ? e.message : 'the check failed',
            }),
        );
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [key, value, style]);

  const current = check?.key === key ? check : null;
  return (
    <Stack gap="2" aria-live="polite">
      {warnings.map((w) => (
        <Alert key={w} status="warning">
          <AlertDescription>{w}</AlertDescription>
        </Alert>
      ))}
      {value && current && (
        <Alert status={current.ok ? 'success' : 'danger'}>
          <AlertTitle>
            {current.ok
              ? 'Decodes correctly'
              : `Could not decode: ${current.reason}`}
          </AlertTitle>
          <AlertDescription>
            {current.ok
              ? 'The rendered code was read back and matches the content.'
              : 'Raise error correction, enlarge the code, shrink the logo or increase contrast.'}
          </AlertDescription>
        </Alert>
      )}
    </Stack>
  );
}
