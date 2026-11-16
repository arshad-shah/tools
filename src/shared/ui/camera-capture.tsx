import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { ToolError } from '@/shared/lib/errors';
import { useCamera } from '@/shared/lib/use-camera';
import { IconPlay, IconSquare } from '@/shared/ui/icons';
import { Button } from './button';
import { Switch } from './controls';
import { Select } from './select';

export interface CameraCaptureProps {
  /** Whether the camera runs. Start and Stop report through onActiveChange. */
  active: boolean;
  onActiveChange?(active: boolean): void;
  /** Receives frames grabbed at about `fps`; the receiver owns (closes) them. */
  onFrame?(bitmap: ImageBitmap): void;
  fps?: number;
  facingMode?: 'user' | 'environment';
  /** Accessible name of the video. */
  label: string;
  onError(e: ToolError): void;
  /**
   * Drawn over the live preview while the camera runs (a framing guide,
   * say). Decorative: hidden from screen readers and from the pointer.
   */
  overlay?: ReactNode;
  className?: string;
}

/**
 * Camera preview and frame source. The kit owns the video element; every
 * track is stopped when `active` turns false and on unmount. After
 * permission it offers a device choice, and a torch switch when the track
 * reports the capability.
 */
export function CameraCapture({
  active,
  onActiveChange,
  onFrame,
  fps = 8,
  facingMode = 'environment',
  label,
  onError,
  overlay,
  className,
}: CameraCaptureProps) {
  const {
    video,
    running,
    setActive,
    devices,
    current,
    choose,
    torchSupported,
    torch,
    setTorch: setTorchOn,
  } = useCamera({ active, onActiveChange, onFrame, fps, facingMode, onError });

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="relative overflow-hidden rounded-md border border-line bg-surface-3">
        <video
          ref={video}
          aria-label={label}
          muted
          playsInline
          className={cn(
            'block aspect-video w-full object-cover',
            !running && 'invisible',
          )}
        />
        {running && overlay ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {overlay}
          </div>
        ) : null}
        {!running && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-muted">
            Camera is off
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button
            variant="secondary"
            leftIcon={<IconSquare size="sm" />}
            onClick={() => setActive(false)}
          >
            Stop
          </Button>
        ) : (
          <Button
            leftIcon={<IconPlay size="sm" />}
            onClick={() => setActive(true)}
          >
            Start
          </Button>
        )}
        {running && devices.length > 0 && (
          <div className="min-w-40 flex-1">
            <Select
              aria-label="Camera"
              value={current}
              items={devices}
              onValueChange={choose}
            />
          </div>
        )}
        {running && torchSupported && (
          <label className="flex items-center gap-2 text-sm text-fg">
            <Switch
              checked={torch}
              onCheckedChange={setTorchOn}
              aria-label="Torch"
            />
            Torch
          </label>
        )}
      </div>
    </div>
  );
}
CameraCapture.displayName = 'CameraCapture';

/**
 * A framing guide for CameraCapture's `overlay`: a centred dashed frame
 * with a baseline, the rest of the preview dimmed, and an optional hint.
 */
export function CameraFrameGuide({ hint }: { hint?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden"
    >
      {hint ? (
        <span className="relative z-10 rounded-sm bg-black/55 px-2 py-0.5 text-sm font-medium text-white">
          {hint}
        </span>
      ) : null}
      <div className="relative h-2/5 w-4/5 rounded-md border-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]">
        <div className="absolute inset-x-[8%] bottom-[22%] border-b-2 border-white/70" />
      </div>
    </div>
  );
}
CameraFrameGuide.displayName = 'CameraFrameGuide';
