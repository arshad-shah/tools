import React, { DragEvent, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  CardBody,
  Center,
  DeviceFrame,
  FileUpload,
  Spinner,
  Stack,
  Text,
} from '@/shared/ui';
import { RivePlayer } from '@/shared/ui/adapters/RivePlayer';
import { PlayerState, type Status } from '../types';
import type { DeviceChoice } from './StagePanel';

/**
 * Drop zone, the Rive canvas and the loading overlay, optionally inside a
 * device frame. The Rive instance is bound to its canvas element, so the
 * stage is rendered once through a portal into a host node that moves into
 * whichever slot is shown: switching the frame never remounts the canvas.
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
  const shouldDisplayCanvas = () =>
    [PlayerState.Active, PlayerState.Loading].includes(status.current);

  const [host] = useState(() => {
    const el = document.createElement('div');
    el.className = 'size-full';
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
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={
        device === 'none'
          ? 'relative size-full overflow-hidden rounded-lg'
          : 'relative size-full overflow-hidden'
      }
    >
      <RivePlayer
        ref={canvasRef}
        label="Rive animation"
        color={background}
        checkerboard={checkerboard}
        hidden={!shouldDisplayCanvas()}
      />

      {!shouldDisplayCanvas() && (
        <Center className="absolute inset-0 p-4">
          <div className="w-full max-w-sm" onDrop={(e) => e.stopPropagation()}>
            <FileUpload
              onFiles={(files) => {
                if (files[0]) void load(files[0]);
              }}
              accept=".riv"
              label="Drag and drop a Rive file, or click to browse"
            />
          </div>
        </Center>
      )}

      {status.current === PlayerState.Loading && (
        <Center className="absolute inset-0 bg-black/40">
          <Stack gap="3" align="center">
            <Spinner size="lg" />
            <Text size="sm" weight="medium" className="text-white">
              Loading animation
            </Text>
          </Stack>
        </Center>
      )}
    </div>
  );

  return (
    <Card className={status.hovering ? 'border-accent' : undefined}>
      <CardBody>
        {device === 'none' ? (
          // A 16:9 stage, never shorter than 400 px (min-h-100) on phones.
          <div ref={slot} className="aspect-video min-h-100 w-full" />
        ) : (
          <div className="max-h-180 overflow-auto">
            <DeviceFrame preset={device}>
              <div ref={slot} className="size-full" />
            </DeviceFrame>
          </div>
        )}
        {createPortal(stage, host)}
      </CardBody>
    </Card>
  );
}
