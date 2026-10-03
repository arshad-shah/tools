import React, { useEffect, useMemo, useRef, useState } from 'react';
import { deriveFilename, saveBlob, saveZip } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { EXTENSION, type ImageJob } from '@/shared/lib/image/pipeline';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  DropZone,
  Grid,
  Inline,
  Progress,
  Stack,
  Statistic,
} from '@/shared/ui';
import { IconDownload, IconShieldCheck, IconX } from '@/shared/ui/icons';
import { BatchTable } from './components/BatchTable';
import { ComparePanel } from './components/ComparePanel';
import { EstimateCard } from './components/EstimateCard';
import { HandoffActions, TOOL_ID } from './components/HandoffActions';
import { PresetPanel } from './components/PresetPanel';
import { batchTotals, notSmaller } from './lib/batch';
import { imageSettings, jobFromSettings } from './settings';
import { useBatch, type BatchEntry } from './useBatch';

const RERUN_DEBOUNCE_MS = 400;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

const isImage = (f: File) => !f.type || f.type.startsWith('image/');

/** The name a finished entry downloads as. */
function outputName(e: BatchEntry): string {
  if (e.row.keepOriginal || !e.job) return e.file.name;
  return deriveFilename(e.file.name, '', EXTENSION[e.job.encoding]);
}

/** The finished entry as a File (the original when it is kept). */
function outputFile(e: BatchEntry): File {
  if (e.row.keepOriginal || !e.result) return e.file;
  return new File([e.result.bytes as Uint8Array<ArrayBuffer>], outputName(e), {
    type: e.result.mime,
  });
}

const ImageCompressor: React.FC = () => {
  const [settings, update] = imageSettings.useSettings();
  const job = useMemo(() => jobFromSettings(settings), [settings]);
  const jobKey = JSON.stringify(job);
  const { entries, running, add, rerun, cancel, clear, setKeepOriginal } =
    useBatch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The preset the batch last ran with. */
  const ranKey = useRef(jobKey);

  const addFiles = (files: File[]) => {
    const images = files.filter(isImage);
    const skipped = files.length - images.length;
    if (skipped > 0)
      notify.error(
        new ToolError(
          'INVALID_FILE',
          skipped === 1
            ? `${files.find((f) => !isImage(f))?.name} is not an image`
            : `${skipped} files are not images`,
        ),
      );
    if (images.length === 0) return;
    ranKey.current = jobKey;
    add(images, job);
  };
  // Images dropped on a hub or sent from another tool open like picked ones.
  useHandoffFiles(addFiles);

  // Live results: a changed preset re-runs the batch once it settles.
  const hasEntries = entries.length > 0;
  useEffect(() => {
    if (jobKey === ranKey.current) return;
    if (!hasEntries) {
      ranKey.current = jobKey;
      return;
    }
    const timer = setTimeout(() => {
      ranKey.current = jobKey;
      rerun(JSON.parse(jobKey) as ImageJob);
    }, RERUN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [jobKey, hasEntries, rerun]);

  const rows = useMemo(() => entries.map((e) => e.row), [entries]);
  const done = entries.filter((e) => e.row.status === 'done' && e.result);
  const totals = batchTotals(rows);
  const finished = rows.filter(
    (r) => r.status !== 'queued' && r.status !== 'running',
  ).length;
  const larger = entries.filter((e) => notSmaller(e.row));
  const selected = done.find((e) => e.row.id === selectedId) ?? done[0] ?? null;

  const downloadOne = (e: BatchEntry) => {
    const f = outputFile(e);
    saveBlob(f, outputName(e), f.type);
  };

  const downloadZip = async () => {
    if (done.length === 0) return;
    try {
      const files = await Promise.all(
        done.map(async (e) => ({
          name: outputName(e),
          data:
            e.row.keepOriginal || !e.result
              ? await readBytes(e.file)
              : e.result.bytes,
        })),
      );
      await saveZip(files, 'images.zip');
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not build the ZIP file');
    }
  };

  const clearAll = () => {
    clear();
    setSelectedId(null);
  };

  useToolCommands(TOOL_ID, [
    {
      id: 'download-zip',
      label: 'Download all as ZIP',
      run: () => void downloadZip(),
      enabled: done.length > 0,
    },
    { id: 'clear', label: 'Clear', run: clearAll, enabled: hasEntries },
    { id: 'cancel', label: 'Cancel all', run: cancel, enabled: running },
  ]);

  const firstFile = entries[0]?.file ?? null;

  return (
    <Stack gap="6">
      <DropZone
        variant={hasEntries ? 'inline' : 'hero'}
        accept={ACCEPT}
        multiple
        onFiles={addFiles}
        title={hasEntries ? 'Add more images' : 'Drop images here'}
        hint="PNG, JPEG, WebP or GIF. Many at once is fine."
        chooseLabel="Choose images"
      />

      <Grid max={3} gap="4" className="items-start">
        <Stack gap="4">
          <PresetPanel settings={settings} update={update} />
          {firstFile && (
            <EstimateCard
              file={firstFile}
              quality={settings.quality}
              background={settings.background}
              resize={job.resize}
              current={settings.encoding}
              onUse={(encoding) => update({ encoding })}
            />
          )}
        </Stack>

        <Stack gap="4" className="sm:col-span-1 lg:col-span-2">
          {hasEntries && (
            <>
              <Inline gap="2" wrap justify="between" align="center">
                <Inline gap="2" wrap>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<IconDownload size="sm" />}
                    disabled={done.length === 0}
                    onClick={() => void downloadZip()}
                  >
                    Download all as ZIP
                  </Button>
                  {running && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<IconX size="sm" />}
                      onClick={cancel}
                    >
                      Cancel all
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </Inline>
                {done.length > 0 && (
                  <HandoffActions
                    outputs={() => done.map(outputFile)}
                    originals={entries.map((e) => e.file)}
                  />
                )}
              </Inline>

              {running && (
                <Progress
                  value={finished}
                  max={rows.length}
                  label="Compression progress"
                />
              )}

              <BatchTable
                rows={rows}
                onSelect={setSelectedId}
                onDownload={(id) => {
                  const e = done.find((d) => d.row.id === id);
                  if (e) downloadOne(e);
                }}
                onKeepOriginal={setKeepOriginal}
              />

              <Box role="group" aria-label="Totals">
                <Grid cols={{ base: 2, md: 4 }} gap="3">
                  <Statistic label="Files done" value={totals.files} />
                  <Statistic
                    label="Total before"
                    value={formatBytes(totals.before)}
                  />
                  <Statistic
                    label="Total after"
                    value={formatBytes(totals.after)}
                  />
                  <Statistic
                    label="Saving"
                    value={
                      totals.saving === null
                        ? 'None yet'
                        : `${totals.saving.toFixed(1)}%`
                    }
                  />
                </Grid>
              </Box>

              {done.length > 0 && (
                <Inline gap="2">
                  <Badge
                    tone="success"
                    variant="soft"
                    icon={<IconShieldCheck size="sm" />}
                  >
                    Metadata removed (EXIF, GPS)
                  </Badge>
                </Inline>
              )}

              {larger.length > 0 && (
                <Alert status="warning">
                  <AlertTitle>Not smaller than the original</AlertTitle>
                  <AlertDescription>
                    Try another format or a lower quality, or choose Keep
                    original in the file list for{' '}
                    {larger.map((e) => e.row.name).join(', ')}.
                  </AlertDescription>
                </Alert>
              )}

              {selected && (
                <ComparePanel
                  entries={done}
                  selected={selected}
                  onSelect={setSelectedId}
                  onDownload={downloadOne}
                />
              )}
            </>
          )}
        </Stack>
      </Grid>
    </Stack>
  );
};

export default ImageCompressor;
