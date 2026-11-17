import { useEffect, useRef, useState } from 'react';
import { rotateCcw, upload as uploadIcon } from '@arshad-shah/cynosure/icons';
import {
  Button,
  Inline,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { InkSample, SamplePaper } from '@/shared/surfaces/pdf/InkSample';
import { FilePicker } from '../../ui/FilePicker';
import { ErrorNotice, LoadingLine } from '../../ui/states';
import { useJob } from '@/shared/state/useJob';
import { ToolError } from '@/shared/lib/errors';
import { INK_COLORS, type SignatureSourceProps } from '@/pdf/sign';
import { photoClient, type PhotoClient } from '@/pdf/sign/photo/client';
import { decodePhoto, downscaleBitmap } from '@/pdf/sign/photo/decode';
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

/** The shot at most MAX_SIDE pixels (file size capped, decoded once). */
async function prepare(shot: Shot): Promise<ImageBitmap> {
  if (shot.kind === 'file') return decodePhoto(shot.file);
  try {
    return await downscaleBitmap(await createImageBitmap(shot.bitmap));
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
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

  // The downscaled shot, decoded once; each run hands the worker a copy
  // (the worker takes ownership), so the Contrast slider never re-decodes.
  const prepared = useRef<{ shot: Shot; bitmap: Promise<ImageBitmap> } | null>(
    null,
  );
  const dropPrepared = () => {
    void prepared.current?.bitmap.then(
      (b) => b.close(),
      () => {},
    );
    prepared.current = null;
  };
  const job = useJob(async ({ signal }, s: Shot, threshold: number) => {
    const photo = worker ?? photoClient();
    if (prepared.current?.shot !== s) {
      dropPrepared();
      prepared.current = { shot: s, bitmap: prepare(s) };
    }
    const copy = await createImageBitmap(await prepared.current.bitmap);
    const cleaned = await photo.clean(copy, { t: threshold }, signal);
    const vector = await photo.trace(cleaned.mask, {}, signal);
    return { vector, angle: cleaned.angle };
  });

  // The captured frame is ours to close.
  const frame = useRef<ImageBitmap | null>(null);
  useEffect(
    () => () => {
      frame.current?.close();
      dropPrepared();
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
    dropPrepared();
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
          setMethod(m as Method);
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
            <Inline>
              <Button
                variant="outline"
                icon={uploadIcon}
                disabled={disabled}
                onClick={open}
              >
                Choose a photo
              </Button>
            </Inline>
          )}
        </FilePicker>
      ) : null}
      <Text as="p" size="sm" tone="muted">
        Sign on plain white paper with dark ink. The photo is cleaned up on this
        device and never uploaded.
      </Text>
      {problem ? <ErrorNotice error={problem} /> : null}
      {job.status === 'running' ? (
        <LoadingLine label="Cleaning up the photo" />
      ) : null}
      {job.status === 'error' && job.error ? (
        <ErrorNotice error={job.error} />
      ) : null}
      {result ? (
        <Stack gap="2">
          <SamplePaper height={128}>
            <InkSample
              label="Signature preview"
              d={result.vector.d}
              width={result.vector.width}
              height={result.vector.height}
              color={ink}
              evenOdd
            />
          </SamplePaper>
          <Text size="sm" tone="muted">
            {straightened(result.angle)}
          </Text>
        </Stack>
      ) : null}
      {shot ? (
        <Inline gap="3" align="end" wrap>
          <Slider
            label="Contrast"
            showValue
            labels={{ value: (v) => v.toFixed(2) }}
            min={0.05}
            max={0.3}
            step={0.01}
            value={t}
            disabled={disabled}
            commitDelay={300}
            onChange={(v) => setT(Number(v))}
            onCommit={(v) => {
              setT(Number(v));
              setUsed(false);
              onChange(null);
              void job.run(shot, Number(v));
            }}
          />
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
            variant="solid"
            tone="accent"
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
            variant="outline"
            icon={rotateCcw}
            disabled={disabled}
            onClick={retake}
          >
            Retake
          </Button>
        </Inline>
      ) : null}
      {used ? (
        <Text size="sm" tone="success">
          Ready to place.
        </Text>
      ) : null}
    </Stack>
  );
}
