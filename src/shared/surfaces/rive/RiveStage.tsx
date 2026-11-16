import React, { useCallback, useState, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { RivePlayer } from './RivePlayer';
import './rive.css';

export interface RiveStageProps {
  /** Accessible name of the animation. */
  label: string;
  /** Any CSS colour behind the artboard (a user choice). */
  color: string;
  checkerboard: boolean;
  /** The canvas is not drawn (no file yet); `overlay` fills the stage. */
  hidden: boolean;
  /** A file is dragged over the stage. */
  highlighted?: boolean;
  /**
   * Wraps the stage's slot in a frame (a device frame); without it the
   * stage is a 16:9 area at least 400 px tall.
   */
  frame?: (slot: React.ReactNode) => React.ReactNode;
  /** Centred over the stage: the file picker, a loading state. */
  overlay?: React.ReactNode;
  previewRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
}

/**
 * The Rive drawing surface: the canvas, the area it is sized to and the
 * drop target around it. The Rive instance is bound to its canvas element,
 * so the stage is rendered once through a portal into a host node that
 * moves into whichever slot is shown: changing the frame never remounts the
 * canvas. Controls around it belong to the page.
 */
export function RiveStage({
  label,
  color,
  checkerboard,
  hidden,
  highlighted,
  frame,
  overlay,
  previewRef,
  canvasRef,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
}: RiveStageProps) {
  const [host] = useState(() => {
    const el = document.createElement('div');
    el.className = 'tools-rive-fill';
    return el;
  });
  const slot = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && host.parentElement !== el) el.appendChild(host);
    },
    [host],
  );

  const stage = (
    <div
      ref={previewRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      className="tools-rive-stage"
      data-framed={frame ? true : undefined}
      data-highlighted={highlighted || undefined}
    >
      <RivePlayer
        ref={canvasRef}
        label={label}
        color={color}
        checkerboard={checkerboard}
        hidden={hidden}
      />
      {overlay ? (
        <div
          className="tools-rive-overlay"
          data-over-canvas={!hidden || undefined}
          onDrop={(e) => {
            if (hidden) e.stopPropagation();
          }}
        >
          <div className="tools-rive-overlay-content">{overlay}</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {frame ? (
        frame(<div ref={slot} className="tools-rive-fill" />)
      ) : (
        <div ref={slot} className="tools-rive-slot" />
      )}
      {createPortal(stage, host)}
    </>
  );
}
