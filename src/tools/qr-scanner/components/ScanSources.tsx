import type { ToolError } from '@/shared/lib/errors';
import {
  Button,
  CameraCapture,
  DropZone,
  Inline,
  SegmentedControl,
  Stack,
  Text,
} from '@/shared/ui';
import { IconClipboard } from '@/shared/ui/icons';

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

/** Where codes come from: an image (file, drop, paste) or the camera. */
export function ScanSources(p: Props) {
  return (
    <Stack gap="3">
      <SegmentedControl
        label="Source"
        value={p.mode}
        onChange={p.onModeChange}
        options={[
          { value: 'image', label: 'Image' },
          { value: 'camera', label: 'Camera' },
        ]}
      />
      {p.mode === 'image' ? (
        <Stack gap="2">
          <DropZone
            variant="inline"
            accept={IMAGE_ACCEPT}
            onFiles={(files) => files[0] && p.onImage(files[0])}
            title="Drop an image with a QR code or barcode"
            hint="PNG, JPEG, WebP or GIF"
            chooseLabel="Choose image"
          />
          <Inline gap="2" align="center">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconClipboard size="sm" />}
              onClick={p.onPaste}
            >
              Paste image
            </Button>
            <Text size="xs" tone="muted">
              Copies of screenshots work too.
            </Text>
          </Inline>
        </Stack>
      ) : (
        <CameraCapture
          active={p.cameraActive}
          onActiveChange={p.onCameraActiveChange}
          onFrame={p.onFrame}
          fps={8}
          label="Camera preview"
          onError={p.onError}
        />
      )}
    </Stack>
  );
}
