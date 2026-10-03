import React, { useEffect } from 'react';
import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import {
  computeResize,
  type ImageEncoding,
  type ResizeSpec,
} from '@/shared/lib/image/pipeline';
import { useJob } from '@/shared/state/useJob';
import { imageClient } from '@/shared/workers/image-client';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Inline,
  Spinner,
  Text,
} from '@/shared/ui';
import { readImageSize } from '../lib/dimensions';
import {
  SAMPLE_MAX,
  scaleEstimate,
  smallestEstimate,
  type FormatEstimate,
} from '../lib/estimate';
import { ENCODING_LABELS } from '../lib/labels';

const ORDER: ImageEncoding[] = ['webp', 'avif', 'jpeg', 'png', 'png-palette'];
const DEBOUNCE_MS = 400;

interface Row extends FormatEstimate {
  /** Set when the sample failed for a reason other than support. */
  failed?: boolean;
}

export interface EstimateCardProps {
  file: File;
  quality: number;
  background: string;
  resize?: ResizeSpec;
  current: ImageEncoding;
  onUse(encoding: ImageEncoding): void;
}

/**
 * Encodes a small sample of the first file in every format and scales each
 * size up by pixel count: a rough, labelled estimate to pick a format by.
 */
export const EstimateCard: React.FC<EstimateCardProps> = ({
  file,
  quality,
  background,
  resize,
  current,
  onUse,
}) => {
  const job = useJob(
    async (ctx, f: File, q: number, bg: string, r?: ResizeSpec) => {
      const size = await readImageSize(f);
      const rows: Row[] = [];
      for (const encoding of ORDER) {
        try {
          const sample = await imageClient().call(
            'process',
            [
              f,
              {
                encoding,
                quality: q,
                background: bg,
                resize: { maxWidth: SAMPLE_MAX, maxHeight: SAMPLE_MAX },
              },
            ],
            { signal: ctx.signal },
          );
          const full = size
            ? computeResize(size.width, size.height, r)
            : sample;
          rows.push({
            encoding,
            bytes: scaleEstimate(sample.bytes.byteLength, sample, full),
          });
        } catch (e) {
          if (ctx.signal.aborted) throw e;
          const unsupported =
            e instanceof ToolError && e.code === 'UNSUPPORTED_FEATURE';
          rows.push({ encoding, bytes: null, failed: !unsupported });
        }
      }
      return rows;
    },
  );
  const { run } = job;
  const resizeKey = JSON.stringify(resize ?? null);

  useEffect(() => {
    const timer = setTimeout(
      () =>
        void run(
          file,
          quality,
          background,
          (JSON.parse(resizeKey) as ResizeSpec | null) ?? undefined,
        ),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [run, file, quality, background, resizeKey]);

  const rows = job.result ?? [];
  const best = smallestEstimate(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Size by format</CardTitle>
        <CardDescription>
          An estimate for {file.name}, from a small sample at the current
          quality.
        </CardDescription>
      </CardHeader>
      <CardBody>
        {rows.length === 0 && !job.error ? (
          <Inline gap="2" align="center">
            <Spinner size="sm" decorative />
            <Text size="sm" tone="subtle">
              Estimating
            </Text>
          </Inline>
        ) : job.error ? (
          <Text size="sm" tone="subtle">
            {job.error.message}
          </Text>
        ) : (
          <ul
            aria-label="Size estimate by format"
            className="-my-2 flex flex-col divide-y divide-line"
          >
            {rows.map((r) => (
              <li
                key={r.encoding}
                className="flex min-h-10 items-center justify-between gap-2 py-1.5"
              >
                <Inline gap="2" align="center" wrap={false}>
                  <Text size="sm" weight="medium">
                    {ENCODING_LABELS[r.encoding]}
                  </Text>
                  {r.encoding === best && (
                    <Badge tone="success" variant="soft" size="sm">
                      Smallest
                    </Badge>
                  )}
                </Inline>
                <Inline gap="1" align="center" wrap={false}>
                  <Text
                    size="sm"
                    tone={r.bytes === null ? 'subtle' : 'muted'}
                    className="tabular-nums"
                  >
                    {r.bytes !== null
                      ? `${formatBytes(r.bytes)} estimate`
                      : r.failed
                        ? 'Could not estimate'
                        : 'Not supported in this browser'}
                  </Text>
                  {r.bytes !== null && r.encoding !== current && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Use ${ENCODING_LABELS[r.encoding]}`}
                      onClick={() => onUse(r.encoding)}
                    >
                      Use
                    </Button>
                  )}
                </Inline>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
};
