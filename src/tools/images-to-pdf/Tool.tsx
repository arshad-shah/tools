import React, { useState } from 'react';
import { IconFileStack } from '@/shared/ui/icons';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Label,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { FileKind, LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { convertToPng } from '@/shared/lib/image-convert';
import { useJob } from '@/shared/state/useJob';
import {
  imagesToPdf,
  type ImageInput,
  type ImagesToPdfOptions,
  type Orientation,
  type PageSizeName,
} from '@/pdf/edit';
import {
  JobPanel,
  PdfDropzone,
  ResultFiles,
  SortableFileList,
  type ResultFile,
} from '@/pdf/components';
import { ImageThumb } from './components/ImageThumb';
import { useImagesToPdfSettings } from './store';

const MIME: Record<FileKind, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const ACCEPT: FileKind[] = ['png', 'jpeg', 'webp', 'gif'];

const PAGE_SIZE_ITEMS = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'US Letter' },
  { value: 'fit', label: 'Fit to image' },
];
const ORIENTATION_ITEMS = [
  { value: 'auto', label: 'Auto' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

const MAX_MARGIN_MM = 50;
const mmToPt = (mm: number) => (mm * 72) / 25.4;
const clampMargin = (mm: number) =>
  Math.min(MAX_MARGIN_MM, Math.max(0, Number.isFinite(mm) ? mm : 0));

const ImagesToPdfTool: React.FC<ToolProps> = () => {
  const [items, setItems] = useState<LoadedFile[]>([]);
  const {
    pageSize,
    orientation,
    marginMm,
    setPageSize,
    setOrientation,
    setMarginMm,
  } = useImagesToPdfSettings();

  const job = useJob(
    async (
      ctx,
      list: LoadedFile[],
      opts: ImagesToPdfOptions,
    ): Promise<ResultFile> => {
      const images: ImageInput[] = [];
      for (const [i, item] of list.entries()) {
        ctx.progress({
          done: i,
          total: list.length,
          label: 'Preparing images',
        });
        ctx.signal.throwIfAborted();
        images.push(
          item.kind === 'png' || item.kind === 'jpeg'
            ? { bytes: item.bytes, kind: item.kind, name: item.name }
            : {
                bytes: await convertToPng(item.bytes, item.kind, item.name),
                kind: 'png',
                name: item.name,
              },
        );
      }
      ctx.progress({
        done: list.length,
        total: list.length,
        label: 'Building PDF',
      });
      const bytes = await imagesToPdf(images, opts);
      return {
        name: deriveFilename(list[0].name, '', 'pdf'),
        bytes,
        detail: `${list.length} ${list.length === 1 ? 'page' : 'pages'}`,
      };
    },
  );

  const running = job.status === 'running';
  const add = (files: LoadedFile[]) => {
    job.reset();
    setItems((prev) => [...prev, ...files]);
  };
  const reorder = (next: LoadedFile[]) => {
    job.reset();
    setItems(next);
  };
  const remove = (id: string) => {
    job.reset();
    setItems((prev) => prev.filter((f) => f.id !== id));
  };
  const clear = () => {
    job.reset();
    setItems([]);
  };
  const changed =
    <T,>(apply: (v: T) => void) =>
    (v: T) => {
      job.reset();
      apply(v);
    };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfDropzone
            multiple
            accept={ACCEPT}
            disabled={running}
            label="Drop images (PNG, JPEG, WebP or GIF) or click to browse"
            onFiles={add}
          />
          {items.length > 0 && (
            <>
              <Text size="sm" tone="muted">
                Drag images, or focus one and press Alt + Up/Down, to set the
                page order. WebP and GIF images are converted to PNG; animated
                GIFs use their first frame.
              </Text>
              <SortableFileList
                items={items}
                disabled={running}
                onReorder={reorder}
                onRemove={remove}
                renderPreview={(item) => (
                  <ImageThumb
                    bytes={item.bytes}
                    mime={MIME[item.kind]}
                    name={item.name}
                  />
                )}
                renderExtra={(item) => (
                  <Badge variant="soft" tone="neutral" size="sm" mono>
                    {item.kind.toUpperCase()}
                  </Badge>
                )}
              />
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stack gap="2">
              <Label htmlFor="i2p-size">Page size</Label>
              <Select
                id="i2p-size"
                value={pageSize}
                items={PAGE_SIZE_ITEMS}
                onValueChange={(v) => changed(setPageSize)(v as PageSizeName)}
              />
            </Stack>
            <Stack gap="2">
              <Label htmlFor="i2p-orientation">Orientation</Label>
              <Select
                id="i2p-orientation"
                value={orientation}
                items={ORIENTATION_ITEMS}
                disabled={pageSize === 'fit'}
                onValueChange={(v) => changed(setOrientation)(v as Orientation)}
              />
            </Stack>
            <Stack gap="2">
              <Label htmlFor="i2p-margin">Margin (mm)</Label>
              <NumberInput
                id="i2p-margin"
                value={marginMm}
                min={0}
                max={MAX_MARGIN_MM}
                step={1}
                onValueChange={(n) => {
                  if (!Number.isFinite(n)) return;
                  changed(setMarginMm)(clampMargin(n));
                }}
              />
            </Stack>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="solid"
              leftIcon={<IconFileStack size="sm" />}
              disabled={items.length === 0 || running}
              onClick={() =>
                job.run(items, {
                  pageSize,
                  orientation,
                  marginPt: mmToPt(clampMargin(marginMm)),
                })
              }
            >
              Create PDF
            </Button>
            <Button
              variant="ghost"
              disabled={items.length === 0 || running}
              onClick={clear}
            >
              Clear
            </Button>
          </div>
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Building PDF">
            {job.result && <ResultFiles files={[job.result]} />}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default ImagesToPdfTool;
