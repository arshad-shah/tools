import type { RefObject } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import {
  createRive,
  loadRive,
  type Rive,
} from '@/shared/ui/adapters/rive-runtime';
import { getAlignmentValue, getFitValue } from '../lib/layout';
import { assertRiveFile } from '../lib/rive-file';
import {
  PlayerState,
  type AlignFitIndex,
  type DebugLog,
  type Dimensions,
  type Status,
} from '../types';

export interface RiveLoadDeps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  riveRef: RefObject<Rive | null>;
  /** The latest canvas size and layout (read after the file's await). */
  latestRef: RefObject<{
    dimensions: Dimensions;
    alignFitIndex: AlignFitIndex;
  }>;
  setStatus(status: Status): void;
  addDebugLog(message: string, type?: DebugLog['type']): void;
  /** The file was read and checked: show its name and size. */
  onFile(file: File, size: string): void;
  /** Runtime events of the current instance. */
  onLoad(): void;
  onLoadError(): void;
  onPlaying(playing: boolean): void;
  /** Creating the instance threw: reset and report. */
  failLoad(): void;
  /** Re-read the animation, state machine and artboard lists. */
  readLists(): void;
}

/**
 * The load path of the player: read and check the .riv file (a job, so a
 * newer pick cancels an older read), then hand its bytes to the current
 * instance or create the first one with the latest size and layout.
 */
export function useRiveLoad(deps: RiveLoadDeps) {
  const { canvasRef, riveRef, latestRef, setStatus, addDebugLog } = deps;

  const readJob = useJob(async (_ctx, file: File) => {
    try {
      const bytes = await readBytes(file);
      assertRiveFile(file.name, bytes);
      return bytes;
    } catch (e) {
      const error = toToolError(e, `Couldn't read ${file.name}`);
      notify.error(error);
      addDebugLog(error.message, 'error');
      throw error;
    }
  });

  /** False when the canvas is gone (the player unmounted during a read). */
  const createInstance = (buffer: ArrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const { dimensions, alignFitIndex } = latestRef.current;
    // Handlers are bound before the runtime can fire anything, and ignore an
    // instance the player has since dropped (reset).
    const live = (fn: () => void) => () => {
      if (riveRef.current === instance) fn();
    };
    const instance: Rive = createRive({
      buffer,
      canvas,
      fit: getFitValue(alignFitIndex),
      alignment: getAlignmentValue(alignFitIndex),
      onLoad: live(deps.onLoad),
      onLoadError: live(deps.onLoadError),
      onPlay: live(() => deps.onPlaying(true)),
      onPause: live(() => deps.onPlaying(false)),
      onStop: live(() => deps.onPlaying(false)),
    });
    riveRef.current = instance;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    instance.resizeToCanvas();
    return true;
  };

  const loadBuffer = (buffer: ArrayBuffer) => {
    setStatus({ current: PlayerState.Loading });
    addDebugLog('Loading animation from buffer...', 'info');
    if (riveRef.current) {
      loadRive(riveRef.current, buffer);
      return;
    }
    try {
      if (!createInstance(buffer)) return;
      setStatus({ current: PlayerState.Active });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addDebugLog(`Error creating Rive instance: ${msg}`, 'error');
      deps.failLoad();
      return;
    }
    // Read the lists as soon as the instance exists; they are empty until
    // the Load event refills them.
    deps.readLists();
  };

  const load = async (file: File) => {
    const size = formatBytes(file.size);
    addDebugLog(`File selected: ${file.name} (${size})`, 'info');
    const bytes = await readJob.run(file);
    if (!bytes) return; // already reported by the job
    deps.onFile(file, size);
    // readBytes returns a view over a whole, fresh ArrayBuffer.
    loadBuffer(bytes.buffer as ArrayBuffer);
  };

  return { load };
}
