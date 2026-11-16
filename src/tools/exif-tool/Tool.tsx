import {
  Badge,
  Button,
  Card,
  FileDrop,
  Grid,
  GridItem,
  IconButton,
  IconTile,
  Inline,
  LoadingDots,
  List,
  ListRow,
  ListRows,
  Notice,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { download, eraser, image, send } from '@arshad-shah/cynosure/icons';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBytes } from '@/shared/lib/format';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { MetaGroups } from './components/MetaGroups';
import { useExifFiles, type ExifEntry } from './components/useExifFiles';
import { exifSettings } from './settings';

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.tif,.tiff';

const LEVEL = {
  high: { label: 'High risk', tone: 'danger' },
  low: { label: 'Low risk', tone: 'warning' },
  none: { label: 'No risk found', tone: 'success' },
} as const;

const SUMMARY = {
  high: 'This photo reveals where it was taken.',
  low: 'This photo can be linked to a device or a person.',
  none: 'No location, serial number or owner name was found.',
} as const;

function rowDetail(e: ExifEntry): string {
  const status =
    e.status === 'working'
      ? 'Cleaning'
      : e.status === 'done'
        ? `Cleaned, ${formatBytes(e.file.size)} to ${formatBytes(e.output?.byteLength ?? 0)}`
        : e.status === 'error'
          ? `Not cleaned: ${e.stripError?.message ?? 'unknown error'}`
          : formatBytes(e.file.size);
  const risk = e.risk
    ? LEVEL[e.risk.level].label
    : e.readError
      ? 'Unreadable'
      : 'Reading';
  return `${risk}. ${status}`;
}

/**
 * EXIF Viewer and Remover (redesign spec, file tool pattern): drop photos,
 * see what each one gives away beside the remove options, remove the
 * metadata, download the clean copies.
 */
export default function ExifTool() {
  const navigate = useNavigate();
  const files = useExifFiles();
  const { entries, selected, running, doneEntries } = files;
  // Keep ICC and Keep orientation are settings: remembered across visits.
  const [options, setOptions] = exifSettings.useSettings();
  useHandoffFiles(files.addFiles);
  const failures = useMemo(
    () => entries.filter((e) => e.status === 'error'),
    [entries],
  );
  const toCompressor = () =>
    sendTo(navigate, 'image-optimizer', {
      kind: 'files',
      files: entries.map((e) => e.file),
      sourceTool: 'exif-tool',
    });

  useToolCommands('exif-tool', [
    {
      id: 'strip',
      label: 'Remove metadata',
      run: () => void files.strip(options),
      enabled: entries.length > 0 && !running,
    },
    {
      id: 'zip',
      label: 'Download ZIP',
      run: () => void files.downloadZip(),
      enabled: doneEntries.length > 0,
    },
    {
      id: 'clear',
      label: 'Clear',
      run: files.clear,
      enabled: entries.length > 0,
    },
  ]);
  useSendCommands('exif-tool', [
    {
      target: 'image-optimizer',
      run: toCompressor,
      enabled: entries.length > 0,
    },
  ]);

  const risk = selected?.risk;

  return (
    <Stack gap="6">
      <FileDrop
        multiple
        accept={ACCEPT}
        size={entries.length ? 'sm' : 'lg'}
        labels={{ prompt: 'Drop photos here, or' }}
        hint="JPEG, PNG and WebP can be cleaned; HEIC, AVIF and TIFF are read only. Photos stay on this device."
        onFiles={files.addFiles}
      />

      {selected ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }}>
            <Stack gap="6">
              <Card as="section" title={`Photos (${entries.length})`}>
                <ListRows label="Photos">
                  {entries.map((e) => (
                    <ListRow
                      key={e.id}
                      label={e.file.name}
                      description={rowDetail(e)}
                      tone={e.status === 'error' ? 'danger' : undefined}
                      active={e.id === selected.id}
                      leading={
                        <IconTile icon={image} size="sm" tone="neutral" />
                      }
                      onClick={() => files.select(e.id)}
                      actions={
                        e.status === 'done' && e.output ? (
                          <IconButton
                            icon={download}
                            label={`Download ${e.file.name}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => files.downloadOne(e)}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </ListRows>
              </Card>
              {selected.readError ? (
                <Notice tone="danger" title="Could not read the metadata">
                  {selected.readError}
                </Notice>
              ) : selected.meta ? (
                <MetaGroups meta={selected.meta} />
              ) : (
                <Inline gap="3" align="center" role="status">
                  <LoadingDots size="sm" tone="muted" />
                  <Text tone="muted">Reading metadata</Text>
                </Inline>
              )}
            </Stack>
          </GridItem>
          <Stack gap="6">
            {risk ? (
              <Card
                as="section"
                title="Privacy"
                description={selected.file.name}
                actions={
                  <Badge tone={LEVEL[risk.level].tone}>
                    {LEVEL[risk.level].label}
                  </Badge>
                }
              >
                <Stack gap="3">
                  <Text size="sm">{SUMMARY[risk.level]}</Text>
                  {risk.reasons.length ? (
                    <List
                      label="Risks found"
                      size="sm"
                      items={risk.reasons.map((r) => ({ id: r, label: r }))}
                    />
                  ) : null}
                  {selected.meta ? (
                    <Text size="sm" tone="muted">
                      Format: {selected.meta.format.toUpperCase()}
                    </Text>
                  ) : null}
                </Stack>
              </Card>
            ) : null}
            <Card as="section" title="Remove metadata">
              <Stack gap="5">
                <Switch
                  label="Keep ICC profile"
                  checked={options.keepIcc}
                  onChange={(keepIcc) => setOptions({ ...options, keepIcc })}
                />
                <Switch
                  label="Keep orientation"
                  checked={options.keepOrientation}
                  onChange={(keepOrientation) =>
                    setOptions({ ...options, keepOrientation })
                  }
                />
                {failures.length ? (
                  <Notice
                    tone="danger"
                    title={
                      failures.length === 1
                        ? '1 file was not cleaned'
                        : `${failures.length} files were not cleaned`
                    }
                  >
                    <List
                      label="Files not cleaned"
                      size="sm"
                      items={failures.map((e) => ({
                        id: e.id,
                        label: `${e.file.name}: ${e.stripError?.message ?? ''}`,
                      }))}
                    />
                  </Notice>
                ) : null}
                <Button
                  variant="solid"
                  tone="accent"
                  size="lg"
                  fullWidth
                  icon={eraser}
                  loading={running}
                  onClick={() => void files.strip(options)}
                >
                  {entries.length === 1
                    ? 'Remove metadata'
                    : `Remove metadata from ${entries.length} photos`}
                </Button>
                <Button
                  variant="soft"
                  fullWidth
                  icon={download}
                  disabled={doneEntries.length === 0 || running}
                  onClick={() => void files.downloadZip()}
                >
                  Download ZIP
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  icon={send}
                  onClick={toCompressor}
                >
                  Send to Image Compressor
                </Button>
                <Button variant="ghost" fullWidth onClick={files.clear}>
                  Clear all
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      ) : null}
    </Stack>
  );
}
