import { useEffect, useRef, useState } from 'react';
import { camera as cameraIcon } from '@arshad-shah/cynosure/icons';
import { Button, Inline, Notice, Stack } from '@arshad-shah/cynosure';
// Cynosure has no camera view (docs/cynosure-gaps.md): the video surface
// stays the kit's; every control around it is Cynosure.
import { CameraCapture, CameraFrameGuide } from '@/shared/ui';
import { LoadingLine } from '../../ui/states';
import { CAMERA_BLOCKED } from '@/shared/ui/camera-errors';
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
 * The kit camera plus a Capture button: the latest frame is kept and handed
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

  // getUserMedia exists only in secure contexts (https, localhost).
  if (insecure()) return <Notice tone="warning">{CAMERA_UNAVAILABLE}</Notice>;

  return (
    <Stack gap="3">
      <CameraCapture
        label="Camera preview"
        active={active}
        fps={4}
        overlay={<CameraFrameGuide hint={FRAME_HINT} />}
        onActiveChange={(on) => {
          setActive(on);
          if (on) setProblem(null);
          else drop();
        }}
        onFrame={(b) => {
          frame.current?.close();
          frame.current = b;
          setHasFrame(true);
        }}
        onError={(e) => setProblem(problemText(e))}
      />
      {active && !hasFrame ? (
        <LoadingLine label="Waiting for camera permission" />
      ) : null}
      {problem ? (
        <Notice tone={problem === CAMERA_DENIED ? 'warning' : 'danger'}>
          {problem}
        </Notice>
      ) : null}
      {active ? (
        <Inline>
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
              setActive(false);
              onCapture(b);
            }}
          >
            Capture
          </Button>
        </Inline>
      ) : null}
    </Stack>
  );
}
