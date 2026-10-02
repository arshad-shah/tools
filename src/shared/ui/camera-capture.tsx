import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { cameraError } from './camera-errors';
import { IconPlay, IconSquare } from '@/shared/ui/icons';
import { Button } from './button';
import { Switch } from './controls';
import { Select, type SelectItem } from './select';

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

const stopAll = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

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
  const video = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(active);
  const [seenActive, setSeenActive] = useState(active);
  if (seenActive !== active) {
    setSeenActive(active);
    setRunning(active);
  }
  const [requested, setRequested] = useState<string | null>(null);
  const [devices, setDevices] = useState<SelectItem[]>([]);
  const [current, setCurrent] = useState('');
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [torch, setTorch] = useState(false);

  const callbacks = useRef({ onFrame, onError, onActiveChange });
  useEffect(() => {
    callbacks.current = { onFrame, onError, onActiveChange };
  });

  const setActive = (on: boolean) => {
    setRunning(on);
    callbacks.current.onActiveChange?.(on);
  };

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const el = video.current;
    const fail = (err: ToolError) => {
      if (cancelled) return;
      setRunning(false);
      callbacks.current.onError(err);
      callbacks.current.onActiveChange?.(false);
    };
    const md =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      fail(
        new ToolError(
          'UNSUPPORTED_FEATURE',
          'This browser cannot use the camera',
        ),
      );
      return;
    }
    md.getUserMedia({
      audio: false,
      video: requested ? { deviceId: { exact: requested } } : { facingMode },
    }).then(
      async (s) => {
        if (cancelled) {
          stopAll(s);
          return;
        }
        stream = s;
        if (el) {
          el.srcObject = s;
          await Promise.resolve(el.play?.()).catch(() => {});
        }
        const t = s.getVideoTracks()[0] ?? null;
        setTrack(t);
        setTorch(false);
        setCurrent(t?.getSettings?.().deviceId ?? '');
        const all = (await md.enumerateDevices?.()) ?? [];
        if (cancelled) return;
        setDevices(
          all
            .filter((d) => d.kind === 'videoinput')
            .map((d, i) => ({
              value: d.deviceId,
              label: d.label || `Camera ${i + 1}`,
            })),
        );
      },
      (e: unknown) => fail(cameraError(e)),
    );
    return () => {
      cancelled = true;
      if (stream) stopAll(stream);
      if (el) el.srcObject = null;
      setTrack(null);
    };
  }, [running, requested, facingMode]);

  // Frame grabbing at about `fps`; a grab still in flight skips a tick.
  useEffect(() => {
    if (!track || fps <= 0) return;
    let busy = false;
    let alive = true;
    const id = window.setInterval(() => {
      const v = video.current;
      const take = callbacks.current.onFrame;
      if (!take || busy || !v || v.readyState < 2) return;
      if (typeof createImageBitmap !== 'function') return;
      busy = true;
      createImageBitmap(v)
        .then((b) => {
          if (alive) callbacks.current.onFrame?.(b);
          else b.close();
        })
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    }, 1000 / fps);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [track, fps]);

  const torchSupported = !!(
    track?.getCapabilities?.() as TorchCapabilities | undefined
  )?.torch;

  const setTorchOn = (on: boolean) => {
    if (!track) return;
    track
      .applyConstraints({
        advanced: [{ torch: on } as MediaTrackConstraintSet],
      })
      .then(
        () => setTorch(on),
        (e: unknown) =>
          callbacks.current.onError(
            toToolError(e, 'The torch could not be switched'),
          ),
      );
  };

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
              onValueChange={(id) => {
                setCurrent(id);
                setRequested(id);
              }}
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
