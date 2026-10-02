import { useState, type RefObject } from 'react';
import { IconDownload, IconPlayCircle, IconX } from '@/shared/ui/icons';
import { Button, Inline, Label, NumberInput, Stack, Text } from '@/shared/ui';
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
    <Stack gap="4">
      <Stack gap="2">
        <Label>Current frame</Label>
        <Button
          variant="secondary"
          leftIcon={<IconDownload size="sm" />}
          disabled={disabled}
          onClick={() => void exportPng()}
        >
          Download PNG
        </Button>
      </Stack>
      <Stack gap="2">
        <Label htmlFor="rive-record-seconds">Record video (seconds)</Label>
        <Inline gap="2" align="center">
          <NumberInput
            id="rive-record-seconds"
            value={seconds}
            onValueChange={(v) => setSeconds(Math.round(v) || 1)}
            min={1}
            max={60}
            disabled={!recordable || recording}
            className="w-32"
          />
          {recording ? (
            <Button
              variant="secondary"
              leftIcon={<IconX size="sm" />}
              onClick={record.cancel}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="secondary"
              leftIcon={<IconPlayCircle size="sm" />}
              disabled={disabled || !recordable}
              onClick={() => void record.run(seconds)}
            >
              Record WebM
            </Button>
          )}
        </Inline>
        {!recordable && (
          <Text size="sm" tone="subtle">
            This browser cannot record WebM video.
          </Text>
        )}
        {recording && (
          <Text size="sm" tone="subtle" role="status">
            Recording {seconds} s of the stage.
          </Text>
        )}
        {record.status === 'error' && record.error && (
          <Text size="sm" className="text-danger" role="alert">
            {record.error.message}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
