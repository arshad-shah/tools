import { CanvasStage } from '@arshad-shah/cynosure';
import React, { useCallback, useState } from 'react';
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
  /**
   * Wraps the stage's slot in a frame (a device frame); without it the
   * stage is a 16:9 area at least 400 px tall.
   */
  frame?: (slot: React.ReactNode) => React.ReactNode;
  /** Centred over the stage: the file picker, a loading state. */
  overlay?: React.ReactNode;
  previewRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** A .riv file dropped anywhere on the stage. */
  onFile: (file: File) => void;
}

/**
 * The Rive drawing surface (the canvas) in Cynosure's CanvasStage, which
 * sizes it, takes a dropped .riv file and centres the overlay. The Rive instance is bound to its canvas element,
 * so the stage is rendered once through a portal into a host node that
 * moves into whichever slot is shown: changing the frame never remounts the
 * canvas. Controls around it belong to the page.
 */
export function RiveStage({
  label,
  color,
  checkerboard,
  hidden,
  frame,
  overlay,
  previewRef,
  canvasRef,
  onFile,
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
    <CanvasStage
      ref={previewRef}
      label={label}
      className="tools-rive-fill"
      accept=".riv"
      onFiles={(files) => files[0] && onFile(files[0])}
      overlay={overlay}
    >
      <RivePlayer
        ref={canvasRef}
        label={label}
        color={color}
        checkerboard={checkerboard}
        hidden={hidden}
      />
    </CanvasStage>
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
