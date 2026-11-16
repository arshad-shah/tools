import {
  Badge,
  Button,
  Card,
  Grid,
  GridItem,
  IconButton,
  Image,
  Inline,
  NumberField,
  Select,
  Skeleton,
  SortableList,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { fileStack, imageOff, trash } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import {
  imagesToPdf,
  type ImageInput,
  type ImagesToPdfOptions,
  type Orientation,
  type PageSizeName,
} from '@/pdf/edit';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard, type ResultFile } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import type { FileKind, LoadedFile } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useHandoff } from '@/shared/lib/handoff';
import { convertToPng } from '@/shared/lib/image-convert';
import { useObjectUrl } from '@/shared/lib/object-url';
import { useJob } from '@/shared/state/useJob';
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

/** An image, small, beside its name (or why it cannot be shown). */
function Thumb({ item }: { item: LoadedFile }) {
  const url = useObjectUrl(item.bytes, MIME[item.kind]);
  return (
    <Grid columns="3rem">
      {!url ? (
        <Skeleton shape="block" height="3rem" />
      ) : (
        <Image
          src={url}
          alt={item.name}
          ratio={1}
          fit="contain"
          radius="sm"
          fallback={
            <Badge
              icon={imageOff}
              tone="danger"
              label={`${item.name} cannot be previewed`}
            />
          }
        />
      )}
    </Grid>
  );
}

/**
 * Images to PDF (redesign spec, file tool pattern): drop images, put them
 * in page order beside the page options, create the PDF, download it.
 */
export default function ImagesToPdfTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
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

  const settings = (
    <Stack gap="5">
      <Select
        label="Page size"
        value={pageSize}
        options={PAGE_SIZE_ITEMS}
        onChange={(v) => changed(setPageSize)(v as PageSizeName)}
      />
      <Select
        label="Orientation"
        value={orientation}
        options={ORIENTATION_ITEMS}
        disabled={pageSize === 'fit'}
        onChange={(v) => changed(setOrientation)(v as Orientation)}
      />
      <NumberField
        label="Margin (mm)"
        value={marginMm}
        min={0}
        max={MAX_MARGIN_MM}
        onChange={(n) => {
          if (n !== null && Number.isFinite(n))
            changed(setMarginMm)(clampMargin(n));
        }}
      />
    </Stack>
  );

  return (
    <Stack gap="6">
      <PdfIntake
        initialFiles={handed}
        multiple
        accept={ACCEPT}
        size={items.length ? 'sm' : 'lg'}
        disabled={running}
        prompt="Drop PNG, JPEG, WebP or GIF images here, or"
        hint="Images stay on this device. WebP and GIF become PNG; an animated GIF gives its first frame."
        onFiles={add}
      />
      {items.length ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }}>
            <Card
              as="section"
              title={`Pages (${items.length})`}
              description="One image per page. Drag an image by its handle to set the order, or focus the handle, press Space and use the arrow keys."
            >
              <SortableList
                label="Images in page order"
                disabled={running}
                items={items.map((item) => ({
                  id: item.id,
                  label: item.name,
                  content: (
                    <Inline gap="5" align="center">
                      <Thumb item={item} />
                      <Stack gap="1" grow minSize="0">
                        <Text weight="medium" truncate>
                          {item.name}
                        </Text>
                        <Text size="sm" tone="muted">
                          {item.kind.toUpperCase()}, {formatBytes(item.size)}
                        </Text>
                      </Stack>
                      <IconButton
                        icon={trash}
                        label={`Remove ${item.name}`}
                        variant="ghost"
                        tone="neutral"
                        size="sm"
                        disabled={running}
                        onClick={() => remove(item.id)}
                      />
                    </Inline>
                  ),
                }))}
                onReorder={(next) =>
                  reorder(
                    next.flatMap((n) => items.filter((i) => i.id === n.id)),
                  )
                }
              />
            </Card>
          </GridItem>
          <Card as="section" title="Page setup">
            <Stack gap="5">
              {settings}
              <JobProgress
                job={job}
                label="Building PDF"
                onCancel={job.cancel}
              />
              {running ? null : (
                <Stack gap="3">
                  <Button
                    variant="solid"
                    tone="accent"
                    size="lg"
                    fullWidth
                    icon={fileStack}
                    onClick={() =>
                      void job.run(items, {
                        pageSize,
                        orientation,
                        marginPt: mmToPt(clampMargin(marginMm)),
                      })
                    }
                  >
                    {`Create a ${items.length}-page PDF`}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={clear}>
                    Clear all
                  </Button>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid>
      ) : null}
      {job.status === 'done' && job.result ? (
        <ResultCard openInWorkspace files={[job.result]} />
      ) : null}
    </Stack>
  );
}
