import type { DragEvent } from 'react';
import type { Status } from '../types';

/** Drag-and-drop handlers for the stage: hover state and dropping a file. */
export function useDropZone(
  status: Status,
  setStatus: (status: Status) => void,
  load: (file: File) => Promise<void>,
) {
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    setStatus({ ...status, hovering: true });
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    setStatus({ ...status, hovering: false });
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    setStatus({ ...status, hovering: true });
    e.dataTransfer.dropEffect = 'copy';
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    setStatus({ ...status, hovering: false });
    if (e.dataTransfer.files[0]) void load(e.dataTransfer.files[0]);
    e.preventDefault();
    e.stopPropagation();
  };

  return { handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
}
