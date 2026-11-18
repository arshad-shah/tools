import {
  Button,
  CameraView,
  FileDrop,
  Inline,
  SegmentedControl,
  shortcutKeys,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { clipboardPaste } from '@arshad-shah/cynosure/icons';
import { useRef } from 'react';

export type SourceMode = 'image' | 'camera';

interface Props {
  mode: SourceMode;
  onModeChange(m: SourceMode): void;
  onImage(file: Blob): void;
  onPaste(): void;
  cameraActive: boolean;
  onCameraActiveChange(active: boolean): void;
  onFrame(bitmap: ImageBitmap): void;
}

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** Frames handed to the decoder per second; the camera runs faster. */
const SCAN_FPS = 8;

/** The live camera: Cynosure's CameraView, its frames read at SCAN_FPS. */
function CameraSource(p: Props) {
  const last = useRef(0);
  const onFrame = (video: HTMLVideoElement) => {
    const now = performance.now();
    if (now - last.current < 1000 / SCAN_FPS || !video.videoWidth) return;
    last.current = now;
    void createImageBitmap(video).then(p.onFrame, () => undefined);
  };
  return (
    <Stack gap="3">
      <CameraView
        label="Camera preview"
        active={p.cameraActive}
        onActiveChange={p.onCameraActiveChange}
        onFrame={onFrame}
        labels={{ start: 'Start', stop: 'Stop', off: 'Camera is off' }}
      />
      <Text size="sm" tone="muted">
        Hold a code in view: it is read as soon as it is sharp.
      </Text>
    </Stack>
  );
}

/** Where codes come from: an image (file, drop, paste) or the camera. */
export function ScanSources(p: Props) {
  return (
    <Stack gap="5">
      <SegmentedControl
        label="Source"
        fullWidth
        value={p.mode}
        onChange={(m) => p.onModeChange(m as SourceMode)}
        options={[
          { value: 'image', label: 'Image' },
          { value: 'camera', label: 'Camera' },
        ]}
      />
      {p.mode === 'image' ? (
        <Stack gap="4">
          <FileDrop
            accept={IMAGE_ACCEPT}
            multiple={false}
            onFiles={(files) => files[0] && p.onImage(files[0])}
            hint={`PNG, JPEG, WebP or GIF. ${shortcutKeys('mod+v').join('+')} anywhere on the page pastes a screenshot.`}
            labels={{
              prompt: 'Drop an image with a QR code or barcode',
              chooseOne: 'Choose image',
            }}
          />
          <Inline>
            <Button variant="soft" icon={clipboardPaste} onClick={p.onPaste}>
              Paste image
            </Button>
          </Inline>
        </Stack>
      ) : (
        <CameraSource {...p} />
      )}
    </Stack>
  );
}
