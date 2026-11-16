import {
  Button,
  EmptyState,
  FileDrop,
  Inline,
  Kbd,
  SegmentedControl,
  Select,
  shortcutKeys,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import {
  camera as cameraIcon,
  clipboardPaste,
  play,
  stop,
} from '@arshad-shah/cynosure/icons';
import type { ToolError } from '@/shared/lib/errors';
import { useCamera } from '@/shared/lib/use-camera';
import { CameraVideo } from '@/shared/surfaces/camera-video';

export type SourceMode = 'image' | 'camera';

interface Props {
  mode: SourceMode;
  onModeChange(m: SourceMode): void;
  onImage(file: Blob): void;
  onPaste(): void;
  cameraActive: boolean;
  onCameraActiveChange(active: boolean): void;
  onFrame(bitmap: ImageBitmap): void;
  onError(e: ToolError): void;
}

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** The live camera (a drawing surface) and its Cynosure controls. */
function CameraSource(p: Props) {
  const {
    video,
    running,
    setActive,
    devices,
    current,
    choose,
    torchSupported,
    torch,
    setTorch,
  } = useCamera({
    active: p.cameraActive,
    onActiveChange: p.onCameraActiveChange,
    onFrame: p.onFrame,
    fps: 8,
    onError: p.onError,
  });
  return (
    <Stack gap="4">
      <CameraVideo ref={video} label="Camera preview" off={!running} />
      {running ? null : (
        <EmptyState
          size="sm"
          icon={cameraIcon}
          title="Camera is off"
          description="Start it and hold a code in view: it is read as soon as it is sharp."
        />
      )}
      <Inline gap="3" align="end" wrap>
        {running ? (
          <Button variant="soft" icon={stop} onClick={() => setActive(false)}>
            Stop
          </Button>
        ) : (
          <Button variant="solid" icon={play} onClick={() => setActive(true)}>
            Start
          </Button>
        )}
        {running && devices.length > 0 ? (
          <Select
            label="Camera"
            size="sm"
            value={current}
            options={devices}
            onChange={choose}
          />
        ) : null}
        {running && torchSupported ? (
          <Switch label="Torch" checked={torch} onChange={setTorch} />
        ) : null}
      </Inline>
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
            hint="PNG, JPEG, WebP or GIF"
            labels={{
              prompt: 'Drop an image with a QR code or barcode',
              chooseOne: 'Choose image',
            }}
          />
          <Inline gap="3" align="center" wrap>
            <Button variant="soft" icon={clipboardPaste} onClick={p.onPaste}>
              Paste image
            </Button>
            <Inline gap="2" align="center">
              <Kbd keys={shortcutKeys('mod+v')} size="sm" />
              <Text size="sm" tone="muted">
                anywhere on the page pastes a screenshot too.
              </Text>
            </Inline>
          </Inline>
        </Stack>
      ) : (
        <CameraSource {...p} />
      )}
    </Stack>
  );
}
