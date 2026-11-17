import { useState, type RefObject } from 'react';
import {
  Button,
  Grid,
  Notice,
  NumberField,
  ProgressBar,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  download,
  record as recordIcon,
  stop,
} from '@arshad-shah/cynosure/icons';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import { canRecord, recordCanvas } from '../lib/record';

const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new ToolError('UNKNOWN', 'Could not capture the frame')),
      'image/png',
    ),
  );

/** The current frame as PNG, or N seconds as WebM video. */
export function ExportPanel({
  canvasRef,
  filename,
  disabled,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  filename: string | null;
  disabled: boolean;
}) {
  const [seconds, setSeconds] = useState(5);
  const recordable = canRecord();
  const name = filename ?? 'animation.riv';

  const exportPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      saveBlob(await canvasBlob(canvas), deriveFilename(name, 'frame', 'png'));
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not capture the frame');
    }
  };

  const record = useJob(async ({ signal }, secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) throw new ToolError('INVALID_INPUT', 'Nothing to record');
    const blob = await recordCanvas(canvas, secs, 60, signal);
    saveBlob(blob, deriveFilename(name, 'recording', 'webm'));
    return blob.size;
  });
  const recording = record.status === 'running';

  return (
    <Stack gap="5">
      <Button
        variant="soft"
        icon={download}
        disabled={disabled}
        onClick={() => void exportPng()}
      >
        Download current frame (PNG)
      </Button>
      <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
        <NumberField
          label="Record video (seconds)"
          value={seconds}
          onChange={(v) => setSeconds(Math.round(v ?? 1) || 1)}
          min={1}
          max={60}
          disabled={!recordable || recording}
        />
        {recording ? (
          <Button variant="soft" icon={stop} onClick={record.cancel}>
            Stop
          </Button>
        ) : (
          <Button
            variant="soft"
            icon={recordIcon}
            disabled={disabled || !recordable}
            onClick={() => void record.run(seconds)}
          >
            Record WebM
          </Button>
        )}
      </Grid>
      {!recordable ? (
        <Text size="sm" tone="muted">
          This browser cannot record WebM video.
        </Text>
      ) : null}
      {recording ? (
        <ProgressBar
          label={`Recording ${seconds} s of the stage`}
          indeterminate
        />
      ) : null}
      {record.status === 'error' && record.error ? (
        <Notice tone="danger">{record.error.message}</Notice>
      ) : null}
    </Stack>
  );
}
