import { useRef, useState } from 'react';
import { camera as cameraIcon } from '@arshad-shah/cynosure/icons';
import {
  Button,
  CameraView,
  type CameraViewHandle,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';

export const CAMERA_DENIED =
  'Camera access was blocked. Allow it in your browser settings, or upload a photo instead.';
export const FRAME_HINT = 'Fit your signature in the frame';
export const CAMERA_UNAVAILABLE =
  "This browser can't use a camera here. Upload a photo instead.";

const insecure = () =>
  typeof window !== 'undefined' && window.isSecureContext === false;

/**
 * The live camera (Cynosure's CameraView, with its Start, Stop and camera
 * choice) and Capture: the picture at that moment is handed over (the
 * receiver owns it) and the camera stops. Frames never leave the device.
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
  const camera = useRef<CameraViewHandle>(null);

  // getUserMedia exists only in secure contexts (https, localhost).
  if (insecure()) return <Notice tone="warning">{CAMERA_UNAVAILABLE}</Notice>;

  const capture = async () => {
    const video = camera.current?.video();
    if (!video) return;
    const frame = await createImageBitmap(video).catch(() => null);
    if (!frame) return;
    setActive(false);
    setHasFrame(false);
    onCapture(frame);
  };

  return (
    <Stack gap="3">
      <CameraView
        label="Camera preview"
        handle={camera}
        active={active}
        onActiveChange={(on) => {
          setActive(on);
          if (!on) setHasFrame(false);
        }}
        onFrame={() => {
          if (!hasFrame) setHasFrame(true);
        }}
        labels={{
          start: 'Start',
          stop: 'Stop',
          off: 'Camera is off',
          denied: CAMERA_DENIED,
          unsupported: CAMERA_UNAVAILABLE,
        }}
      />
      {active ? (
        <>
          <Text size="sm" tone="muted" align="center">
            {FRAME_HINT}
          </Text>
          <Button
            variant="solid"
            tone="accent"
            icon={cameraIcon}
            disabled={disabled || !hasFrame}
            onClick={() => void capture()}
          >
            Capture
          </Button>
        </>
      ) : (
        <Text size="sm" tone="muted">
          Start the camera, then hold the paper with your signature flat in good
          light.
        </Text>
      )}
    </Stack>
  );
}
