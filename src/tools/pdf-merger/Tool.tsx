import {
  Button,
  Card,
  DescriptionList,
  FileDrop,
  Grid,
  GridItem,
  IconButton,
  Image,
  Inline,
  LoadingDots,
  Notice,
  ProgressBar,
  Skeleton,
  SortableList,
  Stack,
  Text,
  TextField,
  useToast,
} from '@arshad-shah/cynosure';
import {
  arrowRight,
  download,
  pageMerge,
  trash,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPageCount,
  merge,
  parsePageRanges,
  rangesToIndices,
} from '@/pdf/edit';
import { usePdfIntake, type PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { PasswordForm } from '@/pdf/ui/PasswordForm';
import { useFirstPageImage } from '@/pdf/ui/use-first-page-image';
import { stageDocument } from '@/pdf/workspace/workspace-store';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { logToolError, ToolError, toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';
import { insertByOrder } from './lib/order';

interface MergeItem extends PdfInputFile {
  pageCount: number;
  /** Blank = all pages. 1-based range syntax. */
  pages: string;
}

interface MergeResult {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  wasEncrypted: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** Page 1 of a file, small, beside its name. */
function Thumb({ item }: { item: MergeItem }) {
  const { src, ratio } = useFirstPageImage(item.bytes, 96);
  // A one-column grid of a fixed track: the image's width.
  return (
    <Grid columns="3rem">
      {src ? (
        <Image
          src={src}
          alt={`${item.name}, page 1`}
          ratio={ratio ?? 1 / Math.SQRT2}
          fit="contain"
          radius="sm"
        />
      ) : (
        <Skeleton shape="block" height="4rem" />
      )}
    </Grid>
  );
}

/**
 * PDF Merger (redesign spec, file tool pattern): drop the files, put them in
 * order and pick pages beside the merge options, merge with one button that
 * says what it does, then download the result.
 */
export default function PdfMergerTool() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [addErrors, setAddErrors] = useState<string[]>([]);
  /** Number of files being read after a drop (0 = idle). */
  const [reading, setReading] = useState(0);

  const job = useJob(async (ctx, list: MergeItem[]): Promise<MergeResult> => {
    const inputs = list.map((item) => {
      if (!item.pages.trim()) return { bytes: item.bytes, pages: undefined };
      try {
        return {
          bytes: item.bytes,
          pages: rangesToIndices(parsePageRanges(item.pages, item.pageCount)),
        };
      } catch (err) {
        const e = toToolError(err);
        throw new ToolError(e.code, `${item.name}: ${e.message}`, {
          cause: err,
        });
      }
    });
    const bytes = await merge(inputs, {
      onProgress: (done, total) =>
        ctx.progress({ done, total, label: 'Merging' }),
    });
    return {
      name: deriveFilename(list[0].name, 'merged', 'pdf'),
      bytes,
      pageCount: inputs.reduce(
        (n, inp, i) => n + (inp.pages?.length ?? list[i].pageCount),
        0,
      ),
      wasEncrypted: list.some((i) => i.wasEncrypted),
    };
  });

  const add = async (files: PdfInputFile[]) => {
    job.reset();
    // pdf-lib reads each file on the main thread to count its pages.
    setReading(files.length);
    const results = await Promise.allSettled(
      files.map(async (f) => ({
        ...f,
        pageCount: await getPageCount(f.bytes),
        pages: '',
      })),
    );
    const ok: MergeItem[] = [];
    const errors: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else {
        const error = toToolError(r.reason);
        logToolError(error);
        errors.push(`${files[i].name}: ${error.message}`);
      }
    });
    setReading(0);
    setAddErrors(errors);
    // A file unlocked after its siblings goes back to its drop position.
    setItems((prev) => insertByOrder(prev, ok));
  };

  const intake = usePdfIntake({
    onFiles: (files) => void add(files),
    multiple: true,
    initialFiles: handed,
  });

  const busy = job.status === 'running';
  const update = (next: MergeItem[]) => {
    job.reset();
    setItems(next);
  };
  const setPages = (id: string, pages: string) =>
    update(items.map((i) => (i.id === id ? { ...i, pages } : i)));
  const run = async () => {
    const result = await job.run(items);
    if (result)
      toast({
        title: `Merged into ${result.name}`,
        tone: 'success',
      });
  };

  const totalPages = items.reduce((n, i) => n + i.pageCount, 0);
  const skipped = [...intake.rejected, ...addErrors];
  const result = job.status === 'done' ? job.result : null;

  return (
    <Stack gap="6">
      <FileDrop
        multiple
        accept=".pdf,application/pdf"
        size={items.length ? 'sm' : 'lg'}
        disabled={busy || intake.busy || reading > 0}
        hint="Add two or more PDFs. They stay on this device."
        labels={{ prompt: 'Drop PDFs here, or' }}
        onFiles={intake.handle}
      />
      {reading > 0 || intake.busy ? (
        <Inline gap="3" align="center" role="status">
          <LoadingDots size="sm" tone="muted" />
          <Text size="sm" tone="muted">
            {reading > 0
              ? `Reading ${plural(reading, 'file')}`
              : 'Checking the files'}
          </Text>
        </Inline>
      ) : null}
      {skipped.length ? (
        <Notice
          tone="danger"
          title={
            skipped.length === 1
              ? 'A file was skipped'
              : `${skipped.length} files were skipped`
          }
          dismissible
          onDismiss={() => setAddErrors([])}
        >
          <Stack gap="1">
            {skipped.map((m) => (
              <Text key={m} as="p">
                {m}
              </Text>
            ))}
          </Stack>
        </Notice>
      ) : null}
      {intake.locked.map((l) => (
        <PasswordForm
          key={l.file.id}
          fileName={l.file.name}
          error={l.error}
          busy={l.busy}
          disabled={busy}
          onSubmit={(pw) => intake.submit(l, pw)}
          onCancel={() => intake.skip(l.file.id)}
        />
      ))}

      {items.length ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }}>
            <Card
              as="section"
              title={`Files (${items.length})`}
              description="Drag a file by its handle to set the order, or focus the handle, press Space and use the arrow keys. Leave pages blank for the whole file."
            >
              <SortableList
                label="Files to merge"
                disabled={busy}
                items={items.map((item) => ({
                  id: item.id,
                  label: item.name,
                  content: (
                    <Inline gap="5" align="center" wrap>
                      <Thumb item={item} />
                      <Stack gap="1" grow minSize="0">
                        <Text weight="medium" truncate>
                          {item.name}
                        </Text>
                        <Text size="sm" tone="muted">
                          {plural(item.pageCount, 'page')},{' '}
                          {formatBytes(item.size)}
                        </Text>
                      </Stack>
                      <TextField
                        size="sm"
                        label={`Pages from ${item.name}`}
                        labelHidden
                        placeholder={`All ${item.pageCount}`}
                        value={item.pages}
                        disabled={busy}
                        onChange={(pages) => setPages(item.id, pages)}
                      />
                      <IconButton
                        icon={trash}
                        label={`Remove ${item.name}`}
                        variant="ghost"
                        tone="neutral"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          update(items.filter((i) => i.id !== item.id))
                        }
                      />
                    </Inline>
                  ),
                }))}
                onReorder={(next) =>
                  update(
                    next.flatMap((n) => items.filter((i) => i.id === n.id)),
                  )
                }
              />
            </Card>
          </GridItem>
          <Card as="section" title="Merge">
            <Stack gap="5">
              <DescriptionList
                layout="inline"
                size="sm"
                items={[
                  { term: 'Files', detail: String(items.length) },
                  { term: 'Pages in the files', detail: String(totalPages) },
                  {
                    term: 'Result',
                    detail: deriveFilename(items[0].name, 'merged', 'pdf'),
                  },
                ]}
              />
              {job.status === 'error' && job.error ? (
                <Notice tone="danger">{job.error.message}</Notice>
              ) : null}
              {busy ? (
                <Stack gap="3">
                  <ProgressBar
                    label="Merging"
                    value={job.progress?.done}
                    max={job.progress?.total ?? 1}
                    indeterminate={!job.progress}
                  />
                  <Button variant="ghost" onClick={job.cancel}>
                    Cancel
                  </Button>
                </Stack>
              ) : (
                <Stack gap="3">
                  <Button
                    variant="solid"
                    tone="accent"
                    size="lg"
                    icon={pageMerge}
                    fullWidth
                    disabled={items.length < 2 || reading > 0}
                    onClick={() => void run()}
                  >
                    {items.length < 2
                      ? 'Add another PDF to merge'
                      : `Merge ${items.length} files`}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setAddErrors([]);
                      update([]);
                    }}
                  >
                    Clear all
                  </Button>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid>
      ) : null}

      {result ? (
        <Card as="section" title="Your merged PDF" padding="lg">
          <Stack gap="5">
            <Notice tone="success" title={`${result.name} is ready`}>
              {plural(result.pageCount, 'page')},{' '}
              {formatBytes(result.bytes.byteLength)}.
              {result.wasEncrypted
                ? ' The original was password-protected. This file is not.'
                : ''}
            </Notice>
            <Inline gap="3" wrap>
              <Button
                variant="solid"
                tone="accent"
                icon={download}
                onClick={() =>
                  saveBlob(result.bytes, result.name, 'application/pdf')
                }
              >
                Download {result.name}
              </Button>
              <Button
                variant="soft"
                iconEnd={arrowRight}
                onClick={() => {
                  const id = stageDocument({
                    name: result.name,
                    bytes: result.bytes,
                    wasEncrypted: false,
                  });
                  navigate(`/pdf/edit?open=${id}`);
                }}
              >
                Open in the workspace
              </Button>
            </Inline>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
