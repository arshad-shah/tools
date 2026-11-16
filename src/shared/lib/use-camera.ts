import { useEffect, useRef, useState } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { cameraError } from '@/shared/lib/camera-errors';

/** A camera the browser offers, for a device choice. */
export interface CameraDevice {
  value: string;
  label: string;
}

export interface UseCameraOptions {
  /** Whether the camera runs. Start and Stop report through onActiveChange. */
  active: boolean;
  onActiveChange?(active: boolean): void;
  /** Receives frames grabbed at about `fps`; the receiver owns (closes) them. */
  onFrame?(bitmap: ImageBitmap): void;
  fps?: number;
  facingMode?: 'user' | 'environment';
  onError(e: ToolError): void;
}

const stopAll = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

/**
 * The camera behind a preview, with no UI: the stream into `video` while
 * `active`, every track stopped when it turns false and on unmount, frames
 * at about `fps`, the cameras to choose from after permission, and the torch
 * when the track reports it. The page draws the video (CameraVideo) and its
 * own controls.
 */
export function useCamera({
  active,
  onActiveChange,
  onFrame,
  fps = 8,
  facingMode = 'environment',
  onError,
}: UseCameraOptions) {
  const video = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(active);
  const [seenActive, setSeenActive] = useState(active);
  if (seenActive !== active) {
    setSeenActive(active);
    setRunning(active);
  }
  const [requested, setRequested] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
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

  const choose = (id: string) => {
    setCurrent(id);
    setRequested(id);
  };

  return {
    video,
    running,
    setActive,
    devices,
    current,
    choose,
    torchSupported,
    torch,
    setTorch: setTorchOn,
  };
}
