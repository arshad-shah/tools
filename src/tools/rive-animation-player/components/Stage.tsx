import React, { DragEvent } from 'react';
import {
  Card,
  CardBody,
  Center,
  FileUpload,
  Spinner,
  Stack,
  Text,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { PlayerState, type BackgroundColor, type Status } from '../types';

/** Drop zone, the Rive canvas and the loading overlay. */
export function Stage({
  status,
  background,
  previewRef,
  canvasRef,
  handleDrop,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  load,
}: {
  status: Status;
  background: BackgroundColor;
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

  return (
    <Card className={status.hovering ? 'border-accent' : undefined}>
      <CardBody>
        <div
          ref={previewRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className="relative h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg"
        >
          <canvas
            ref={canvasRef}
            className={cn(
              shouldDisplayCanvas() ? 'block' : 'hidden',
              background === 'white'
                ? 'bg-white'
                : background === 'black'
                  ? 'bg-black'
                  : 'bg-transparent',
            )}
          />

          {!shouldDisplayCanvas() && (
            <Center className="absolute inset-0 p-4">
              <div
                className="w-full max-w-sm"
                onDrop={(e) => e.stopPropagation()}
              >
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
                  Loading animation…
                </Text>
              </Stack>
            </Center>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
