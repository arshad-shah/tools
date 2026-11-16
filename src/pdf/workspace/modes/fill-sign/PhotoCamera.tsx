import { useEffect, useRef, useState } from 'react';
import { camera as cameraIcon, play, stop } from '@arshad-shah/cynosure/icons';
import {
  Button,
  EmptyState,
  Inline,
  Notice,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
// Cynosure has no camera view (docs/cynosure-gaps.md, gap 39): the stream
// is useCamera's and the picture the CameraVideo drawing surface; every
// control around it is Cynosure.
import { useCamera } from '@/shared/lib/use-camera';
import { CameraVideo } from '@/shared/ui/camera-video';
import { CAMERA_BLOCKED } from '@/shared/ui/camera-errors';
import { LoadingLine } from '../../ui/states';
import type { ToolError } from '@/shared/lib/errors';

export const CAMERA_DENIED =
  'Camera access was blocked. Allow it in your browser settings, or upload a photo instead.';
export const FRAME_HINT = 'Fit your signature in the frame';
export const CAMERA_UNAVAILABLE =
  "This browser can't use a camera here. Upload a photo instead.";

/** Why the camera is not running, as the message shown. */
function problemText(e: ToolError): string {
  if (e.message === CAMERA_BLOCKED) return CAMERA_DENIED;
  if (e.code === 'UNSUPPORTED_FEATURE') return CAMERA_UNAVAILABLE;
  return e.message;
}

const insecure = () =>
  typeof window !== 'undefined' && window.isSecureContext === false;

/**
 * The live camera, Start and Stop, a camera choice and Capture: the latest frame is kept and handed
 * over (the receiver owns it) when Capture is pressed, which also stops
 * the camera. Frames never leave the device.
 */
export function PhotoCamera({
  onCapture,
  disabled,
}: {
  onCapture(frame: ImageBitmap): void;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const frame = useRef<ImageBitmap | null>(null);

  const drop = () => {
    frame.current?.close();
    frame.current = null;
    setHasFrame(false);
  };
  useEffect(
    () => () => {
      frame.current?.close();
      frame.current = null;
    },
    [],
  );

  const {
    video,
    running,
    setActive: run,
    devices,
    current,
    choose,
  } = useCamera({
    active,
    onActiveChange: (on) => {
      setActive(on);
      if (on) setProblem(null);
      else drop();
    },
    onFrame: (b) => {
      frame.current?.close();
      frame.current = b;
      setHasFrame(true);
    },
    fps: 4,
    onError: (e) => setProblem(problemText(e)),
  });

  // getUserMedia exists only in secure contexts (https, localhost).
  if (insecure()) return <Notice tone="warning">{CAMERA_UNAVAILABLE}</Notice>;

  return (
    <Stack gap="3">
      <CameraVideo ref={video} label="Camera preview" off={!running} />
      {running ? (
        <Text size="sm" tone="muted" align="center">
          {FRAME_HINT}
        </Text>
      ) : (
        <EmptyState
          size="sm"
          icon={cameraIcon}
          title="Camera is off"
          description="Start it, then hold the paper with your signature flat in good light."
        />
      )}
      {running && !hasFrame ? (
        <LoadingLine label="Waiting for camera permission" />
      ) : null}
      {problem ? (
        <Notice tone={problem === CAMERA_DENIED ? 'warning' : 'danger'}>
          {problem}
        </Notice>
      ) : null}
      <Inline gap="2" align="end" wrap>
        {running ? (
          <>
            <Button
              variant="solid"
              tone="accent"
              icon={cameraIcon}
              disabled={disabled || !hasFrame}
              onClick={() => {
                const b = frame.current;
                if (!b) return;
                frame.current = null;
                setHasFrame(false);
                run(false);
                onCapture(b);
              }}
            >
              Capture
            </Button>
            <Button variant="soft" icon={stop} onClick={() => run(false)}>
              Stop
            </Button>
            {devices.length > 1 ? (
              <Select
                label="Camera"
                size="sm"
                value={current}
                options={devices}
                onChange={choose}
              />
            ) : null}
          </>
        ) : (
          <Button
            variant="solid"
            icon={play}
            disabled={disabled}
            onClick={() => run(true)}
          >
            Start
          </Button>
        )}
      </Inline>
    </Stack>
  );
}
