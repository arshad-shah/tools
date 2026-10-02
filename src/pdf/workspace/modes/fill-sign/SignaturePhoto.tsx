import { useEffect, useRef, useState } from 'react';
import { IconRotateCcw, IconUpload } from '@/shared/ui/icons';
import {
  Button,
  ErrorState,
  FilePicker,
  Inline,
  Label,
  LoadingState,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  VectorSample,
} from '@/shared/ui';
import { useJob } from '@/shared/state/useJob';
import { ToolError } from '@/shared/lib/errors';
import { INK_COLORS, type SignatureSourceProps } from '@/pdf/sign';
import { photoClient, type PhotoClient } from '@/pdf/sign/photo/client';
import { InkField } from './InkField';
import { PhotoCamera } from './PhotoCamera';

type Method = 'camera' | 'upload';
/** What the clean-up re-runs from: the captured frame or the chosen file. */
type Shot =
  | { kind: 'frame'; bitmap: ImageBitmap }
  | { kind: 'file'; file: File };

const METHODS: { value: Method; label: string }[] = [
  { value: 'camera', label: 'Camera' },
  { value: 'upload', label: 'Upload' },
];
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const EXTENSIONS = /\.(png|jpe?g|webp)$/i;
const ACCEPT = [...TYPES, '.png', '.jpg', '.jpeg', '.webp'].join(',');
/** Bradley-Roth sensitivity: the "Contrast" slider. */
const T_DEFAULT = 0.15;

const supported = (f: File) =>
  f.type ? TYPES.includes(f.type) : EXTENSIONS.test(f.name);

const unsupported = () =>
  new ToolError(
    'INVALID_FILE',
    'This kind of photo is not supported. Use a PNG, JPEG or WebP image.',
  );

/** A fresh bitmap of the shot (the clean-up takes ownership of it). */
async function bitmapOf(shot: Shot): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(
      shot.kind === 'file' ? shot.file : shot.bitmap,
    );
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be read', {
      cause,
    });
  }
}

const straightened = (angle: number) => {
  const n = Math.round(Math.abs(angle));
  if (n === 0) return 'No straightening needed';
  return `Straightened by ${n} ${n === 1 ? 'degree' : 'degrees'}`;
};

export interface SignaturePhotoProps extends SignatureSourceProps {
  /** The photo worker (tests pass a fake). */
  client?: Pick<PhotoClient, 'clean' | 'trace'>;
}

/**
 * A photo of a signature on paper (plan H-6): from the camera or a file,
 * cleaned up on the device (background removed, straightened, cropped),
 * traced to vector outlines, previewed, then handed on as a traced source.
 */
export function SignaturePhoto({
  onChange,
  disabled,
  client,
}: SignaturePhotoProps) {
  const [method, setMethod] = useState<Method>('camera');
  const [shot, setShot] = useState<Shot | null>(null);
  const [problem, setProblem] = useState<ToolError | null>(null);
  const [t, setT] = useState(T_DEFAULT);
  const [ink, setInk] = useState(INK_COLORS[0].value);
  const [used, setUsed] = useState(false);
  const worker = client ?? null;

  const job = useJob(async ({ signal }, s: Shot, threshold: number) => {
    const photo = worker ?? photoClient();
    const cleaned = await photo.clean(
      await bitmapOf(s),
      { t: threshold },
      signal,
    );
    const vector = await photo.trace(cleaned.mask, {}, signal);
    return { vector, angle: cleaned.angle };
  });

  // The captured frame is ours to close.
  const frame = useRef<ImageBitmap | null>(null);
  useEffect(
    () => () => {
      frame.current?.close();
    },
    [],
  );

  const start = (next: Shot) => {
    if (next.kind === 'frame') frame.current = next.bitmap;
    setShot(next);
    setProblem(null);
    setUsed(false);
    onChange(null);
    void job.run(next, t);
  };

  const retake = () => {
    frame.current?.close();
    frame.current = null;
    setShot(null);
    setProblem(null);
    setUsed(false);
    job.reset();
    onChange(null);
  };

  const result = job.status === 'done' ? job.result : null;
  const busy = disabled || job.status === 'running';

  return (
    <Stack gap="3">
      <SegmentedControl
        label="Photo source"
        size="sm"
        value={method}
        options={METHODS.map((o) => ({ ...o, disabled: !!shot || disabled }))}
        onChange={(m) => {
          setMethod(m);
          setProblem(null);
        }}
      />
      {!shot && method === 'camera' ? (
        <PhotoCamera
          disabled={disabled}
          onCapture={(bitmap) => start({ kind: 'frame', bitmap })}
        />
      ) : null}
      {!shot && method === 'upload' ? (
        <FilePicker
          accept={ACCEPT}
          onFiles={([file]) => {
            if (supported(file)) start({ kind: 'file', file });
            else setProblem(unsupported());
          }}
        >
          {(open) => (
            <Button
              variant="secondary"
              leftIcon={<IconUpload size="sm" />}
              disabled={disabled}
              onClick={open}
              className="self-start"
            >
              Choose a photo
            </Button>
          )}
        </FilePicker>
      ) : null}
      <Text size="sm" tone="muted">
        Sign on plain white paper with dark ink. The photo is cleaned up on this
        device and never uploaded.
      </Text>
      {problem ? <ErrorState error={problem} headingLevel={4} /> : null}
      {job.status === 'running' ? (
        <LoadingState label="Cleaning up the photo" className="py-4" />
      ) : null}
      {job.status === 'error' && job.error ? (
        <ErrorState error={job.error} headingLevel={4} />
      ) : null}
      {result ? (
        <Stack gap="2">
          <div className="flex h-32 items-center justify-center rounded-md border border-line bg-white p-2">
            <VectorSample
              label="Signature preview"
              d={result.vector.d}
              width={result.vector.width}
              height={result.vector.height}
              color={ink}
              evenOdd
              className="size-full"
            />
          </div>
          <Text size="sm" tone="muted">
            {straightened(result.angle)}
          </Text>
        </Stack>
      ) : null}
      {shot ? (
        <Inline gap="3" align="end" wrap>
          <Stack gap="1" className="min-w-48 flex-1">
            <Label htmlFor="sig-photo-contrast">Contrast</Label>
            <Inline gap="2" align="center">
              <Slider
                id="sig-photo-contrast"
                aria-label="Contrast"
                min={0.05}
                max={0.3}
                step={0.01}
                value={t}
                disabled={disabled}
                onValueChange={(v) => {
                  setT(v);
                  setUsed(false);
                  onChange(null);
                  void job.run(shot, v);
                }}
              />
              <Text as="span" size="sm" tone="muted" className="w-10">
                {t.toFixed(2)}
              </Text>
            </Inline>
          </Stack>
          <InkField
            value={ink}
            disabled={disabled}
            onChange={(v) => {
              setInk(v);
              if (used && result)
                onChange({ kind: 'trace', vector: result.vector, color: v });
            }}
          />
        </Inline>
      ) : null}
      {shot ? (
        <Inline gap="2" wrap>
          <Button
            variant="primary"
            disabled={busy || !result}
            onClick={() => {
              if (!result) return;
              setUsed(true);
              onChange({ kind: 'trace', vector: result.vector, color: ink });
            }}
          >
            Use this signature
          </Button>
          <Button
            variant="secondary"
            leftIcon={<IconRotateCcw size="sm" />}
            disabled={disabled}
            onClick={retake}
          >
            Retake
          </Button>
        </Inline>
      ) : null}
      {used ? (
        <Text size="sm" role="status">
          Ready to place.
        </Text>
      ) : null}
    </Stack>
  );
}
