import {
  Card,
  DeviceFrame,
  FileDrop,
  ProgressBar,
} from '@arshad-shah/cynosure';
import type React from 'react';
import type { DragEvent } from 'react';
import { RiveStage } from '@/shared/surfaces/rive/RiveStage';
import { PlayerState, type Status } from '../types';
import type { DeviceChoice } from './StagePanel';

const FRAMES = {
  phone: 'phone',
  tablet: 'tablet',
  desktop: 'browser',
} as const;

/**
 * The Rive canvas (a drawing surface), optionally in a Cynosure device
 * frame, with the file picker before a file is loaded and a progress card
 * while it loads.
 */
export function Stage({
  status,
  background,
  checkerboard,
  device,
  previewRef,
  canvasRef,
  handleDrop,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  load,
}: {
  status: Status;
  /** Any CSS colour behind the artboard. */
  background: string;
  checkerboard: boolean;
  device: DeviceChoice;
  previewRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleDrop: (e: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  load: (file: File) => Promise<void>;
}) {
  const shown = [PlayerState.Active, PlayerState.Loading].includes(
    status.current,
  );
  const overlay =
    status.current === PlayerState.Loading ? (
      <Card padding="md">
        <ProgressBar label="Loading animation" indeterminate />
      </Card>
    ) : !shown ? (
      <FileDrop
        accept=".riv"
        multiple={false}
        onFiles={(files) => {
          if (files[0]) void load(files[0]);
        }}
        hint="A .riv file, read on this device only"
        labels={{
          prompt: 'Drag and drop a Rive file',
          chooseOne: 'Choose a Rive file',
        }}
      />
    ) : null;

  return (
    <RiveStage
      label="Rive animation"
      color={background}
      checkerboard={checkerboard}
      hidden={!shown}
      highlighted={status.hovering}
      overlay={overlay}
      frame={
        device === 'none'
          ? undefined
          : (slot) => (
              <DeviceFrame device={FRAMES[device]} label={`${device} frame`}>
                {slot}
              </DeviceFrame>
            )
      }
      previewRef={previewRef}
      canvasRef={canvasRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    />
  );
}
