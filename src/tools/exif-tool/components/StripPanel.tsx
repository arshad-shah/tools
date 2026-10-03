import { createContext, useContext, useId, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBytes } from '@/shared/lib/format';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataGrid,
  IconButton,
  Inline,
  Label,
  List,
  ListItem,
  Stack,
  Switch,
  type GridColumn,
} from '@/shared/ui';
import {
  IconDownload,
  IconEraser,
  IconFileDown,
  IconSendTo,
} from '@/shared/ui/icons';
import type { StripOptions } from '../lib/strip';
import type { ExifEntry, ExifFiles } from './useExifFiles';

const RISK_TEXT = { high: 'High', low: 'Low', none: 'None' } as const;

function statusText(e: ExifEntry): string {
  switch (e.status) {
    case 'ready':
      return 'Ready';
    case 'working':
      return 'Working';
    case 'done':
      return 'Done';
    case 'error':
      return `Failed: ${e.stripError?.message ?? 'unknown error'}`;
  }
}

/** The row download reaches the cells through context (COLUMNS stays one constant). */
const Download = createContext<((e: ExifEntry) => void) | null>(null);

function RowDownload({ entry }: { entry: ExifEntry }) {
  const download = useContext(Download);
  if (!download || entry.status !== 'done' || !entry.output) return null;
  return (
    <IconButton
      size="sm"
      variant="ghost"
      icon={IconFileDown}
      label={`Download ${entry.file.name}`}
      onClick={() => download(entry)}
    />
  );
}

const COLUMNS: GridColumn<ExifEntry>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (e) => e.file.name,
    pinned: 'start',
  },
  { id: 'status', header: 'Status', accessor: statusText },
  {
    id: 'risks',
    header: 'Risks',
    accessor: (e) =>
      e.risk
        ? [RISK_TEXT[e.risk.level], ...e.risk.reasons].join(', ')
        : e.readError
          ? 'Unreadable'
          : 'Reading',
  },
  {
    id: 'before',
    header: 'Size before',
    accessor: (e) => formatBytes(e.file.size),
  },
  {
    id: 'after',
    header: 'Size after',
    accessor: (e) => (e.output ? formatBytes(e.output.byteLength) : ''),
  },
  {
    id: 'download',
    header: 'Download',
    accessor: (e) => (e.status === 'done' && e.output ? 'Download' : ''),
    render: (e) => <RowDownload entry={e} />,
  },
];

export interface StripPanelProps {
  files: ExifFiles;
  options: Required<StripOptions>;
  onOptionsChange(o: Required<StripOptions>): void;
}

/** Options, the batch grid and the downloads for removing metadata. */
export function StripPanel({
  files,
  options,
  onOptionsChange,
}: StripPanelProps) {
  const navigate = useNavigate();
  const iccId = useId();
  const orientationId = useId();
  const { entries, running, doneEntries } = files;
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
  useSendCommands('exif-tool', [
    {
      target: 'image-optimizer',
      run: toCompressor,
      enabled: entries.length > 0,
    },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">Remove metadata</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Inline gap="6" wrap>
            <Inline gap="2" align="center">
              <Switch
                id={iccId}
                checked={options.keepIcc}
                onCheckedChange={(keepIcc) =>
                  onOptionsChange({ ...options, keepIcc })
                }
              />
              <Label htmlFor={iccId}>Keep ICC profile</Label>
            </Inline>
            <Inline gap="2" align="center">
              <Switch
                id={orientationId}
                checked={options.keepOrientation}
                onCheckedChange={(keepOrientation) =>
                  onOptionsChange({ ...options, keepOrientation })
                }
              />
              <Label htmlFor={orientationId}>Keep orientation</Label>
            </Inline>
          </Inline>

          <Download value={files.downloadOne}>
            <DataGrid
              rows={entries}
              columns={COLUMNS}
              rowKey={(e) => e.id}
              ariaLabel="Files to clean"
              emptyLabel="No files yet"
            />
          </Download>

          {failures.length > 0 ? (
            <Alert status="danger">
              <AlertTitle>
                {failures.length === 1
                  ? '1 file was not cleaned'
                  : `${failures.length} files were not cleaned`}
              </AlertTitle>
              <List aria-label="Files not cleaned">
                {failures.map((e) => (
                  <ListItem key={e.id}>
                    {e.file.name}: {e.stripError?.message}
                  </ListItem>
                ))}
              </List>
            </Alert>
          ) : null}

          <Inline gap="2" wrap>
            <Button
              variant="primary"
              leftIcon={<IconEraser size="sm" />}
              loading={running}
              disabled={entries.length === 0}
              onClick={() => void files.strip(options)}
            >
              Remove metadata
            </Button>
            <Button
              leftIcon={<IconDownload size="sm" />}
              disabled={doneEntries.length === 0 || running}
              onClick={() => void files.downloadZip()}
            >
              Download ZIP
            </Button>
            <Button
              variant="ghost"
              leftIcon={<IconSendTo size="sm" />}
              disabled={entries.length === 0}
              onClick={toCompressor}
            >
              Send to Image Compressor
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
}
