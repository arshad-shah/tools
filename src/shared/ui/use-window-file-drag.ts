import { useEffect, useRef, useState } from 'react';

const carriesFiles = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Tracks files dragged over the window (for DropZone variant="fullscreen").
 * Shows on dragenter with files, hides on drop, on leaving the window and on
 * Escape; a drop anywhere hands the files to `onFiles`.
 */
export function useWindowFileDrag(
  onFiles: (files: File[]) => void,
  opts: { enabled?: boolean } = {},
): { dragging: boolean } {
  const enabled = opts.enabled ?? true;
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const handler = useRef(onFiles);
  useEffect(() => {
    handler.current = onFiles;
  }, [onFiles]);

  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      depth.current = 0;
      setDragging(false);
    };
    const onEnter = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      depth.current++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      // relatedTarget null: the pointer left the window.
      if (depth.current === 0 || e.relatedTarget === null) reset();
    };
    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      reset();
      // An inline DropZone (or any handler) that already took this drop
      // marked it handled: deliver nothing twice.
      if (e.defaultPrevented) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) handler.current(files);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled]);

  return { dragging: enabled && dragging };
}
