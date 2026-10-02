import { ToolError } from '@/shared/lib/errors';

export const WEBM = 'video/webm';

export function canRecord(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function' &&
    MediaRecorder.isTypeSupported(WEBM)
  );
}

/**
 * Records `seconds` of a canvas to WebM through MediaRecorder on
 * `canvas.captureStream(fps)`. Aborting stops early and rejects CANCELLED.
 */
export function recordCanvas(
  canvas: HTMLCanvasElement,
  seconds: number,
  fps = 60,
  signal?: AbortSignal,
): Promise<Blob> {
  if (!canRecord() || typeof canvas.captureStream !== 'function')
    return Promise.reject(
      new ToolError(
        'UNSUPPORTED_FEATURE',
        'This browser cannot record WebM video',
      ),
    );
  if (!(seconds > 0 && seconds <= 60))
    return Promise.reject(
      new ToolError('INVALID_INPUT', 'Record between 1 and 60 seconds'),
    );
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: WEBM });
  const chunks: Blob[] = [];
  return new Promise<Blob>((resolve, reject) => {
    let cancelled = false;
    const timer = setTimeout(() => recorder.stop(), seconds * 1000);
    const onAbort = () => {
      cancelled = true;
      clearTimeout(timer);
      recorder.stop();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = (e) => {
      clearTimeout(timer);
      reject(new ToolError('UNKNOWN', 'Recording failed', { cause: e }));
    };
    recorder.onstop = () => {
      signal?.removeEventListener('abort', onAbort);
      for (const t of stream.getTracks()) t.stop();
      if (cancelled) reject(new ToolError('CANCELLED', 'Recording cancelled'));
      else resolve(new Blob(chunks, { type: WEBM }));
    };
    recorder.start(250);
  });
}
