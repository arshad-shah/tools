import React, { useMemo, useState } from 'react';
import { RotateCcw, RotateCw, Trash2, Undo2, Download } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import { applyPageEdits } from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageGrid,
  PdfDropzone,
  usePageSelection,
  type PageTile,
} from '@/pdf/components';
import {
  initialTiles,
  removeTiles,
  rotateTiles,
  tilesToEdits,
} from './lib/edits';

/**
 * Edits belong to one loaded file (not to a worker docId, which changes if
 * the render worker restarts and reopens it); a different file discards them.
 */
interface EditState {
  file: LoadedFile;
  tiles: PageTile[];
}

const only = (key: string) => new Set([key]);

const OrganizeTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(async (ctx, source: LoadedFile, current: PageTile[]) => {
    const { bytes, notes } = await applyPageEdits(
      source.bytes,
      tilesToEdits(current),
    );
    const name = deriveFilename(source.name, 'organized', 'pdf');
    ctx.signal.throwIfAborted();
    saveBlob(bytes, name, 'application/pdf');
    notify.success(`Saved ${name}`);
    return { name, notes };
  });

  const pageCount = doc?.pageCount ?? 0;
  const pristine = useMemo(() => initialTiles(pageCount), [pageCount]);
  const tiles = file && edit?.file === file ? edit.tiles : pristine;
  const keys = useMemo(() => tiles.map((t) => t.key), [tiles]);
  const selection = usePageSelection(keys);
  const { selected } = selection;
  const busy = job.status === 'running';

  const commit = (nextTiles: PageTile[]) => {
    if (!file) return;
    job.reset();
    setEdit({ file, tiles: nextTiles });
  };
  const changeFile = (next: LoadedFile | null) => {
    job.reset();
    setEdit(null);
    selection.clear();
    setFile(next);
  };

  const dirty =
    doc !== null &&
    JSON.stringify(tiles) !== JSON.stringify(initialTiles(doc.pageCount));

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone onFiles={(f) => changeFile(f[0])} />
          ) : (
            <Inline justify="between" align="center" gap="3" wrap>
              <Text weight="semibold">{file.name}</Text>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => changeFile(null)}
              >
                Choose another file
              </Button>
            </Inline>
          )}
          {loading && <Text tone="muted">Opening…</Text>}
          {error && (
            <Alert status="danger">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {file && doc && (
            <>
              <Inline gap="2" wrap align="center">
                <Text size="sm" tone="muted">
                  {tiles.length} of {doc.pageCount} pages · {selected.size}{' '}
                  selected
                </Text>
                <Button
                  size="sm"
                  leftIcon={<RotateCcw size={14} />}
                  disabled={busy || !selected.size}
                  onClick={() => commit(rotateTiles(tiles, selected, -90))}
                >
                  Rotate left
                </Button>
                <Button
                  size="sm"
                  leftIcon={<RotateCw size={14} />}
                  disabled={busy || !selected.size}
                  onClick={() => commit(rotateTiles(tiles, selected, 90))}
                >
                  Rotate right
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 size={14} />}
                  disabled={
                    busy || !selected.size || selected.size >= tiles.length
                  }
                  onClick={() => commit(removeTiles(tiles, selected))}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Undo2 size={14} />}
                  disabled={busy || !dirty}
                  onClick={() => {
                    commit(initialTiles(doc.pageCount));
                    selection.clear();
                  }}
                >
                  Reset
                </Button>
              </Inline>
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={selected}
                onToggle={selection.toggle}
                onReorder={busy ? undefined : (next) => commit(next)}
                renderActions={(tile, _position, { tabIndex }) => (
                  <span className="flex gap-1">
                    <IconButton
                      tabIndex={tabIndex}
                      label={`Rotate page ${tile.pageIndex + 1} left`}
                      icon={<RotateCcw size={12} />}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        commit(rotateTiles(tiles, only(tile.key), -90))
                      }
                    />
                    <IconButton
                      tabIndex={tabIndex}
                      label={`Rotate page ${tile.pageIndex + 1} right`}
                      icon={<RotateCw size={12} />}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        commit(rotateTiles(tiles, only(tile.key), 90))
                      }
                    />
                    <IconButton
                      tabIndex={tabIndex}
                      label={`Delete page ${tile.pageIndex + 1}`}
                      icon={<Trash2 size={12} />}
                      size="xs"
                      variant="ghost"
                      disabled={busy || tiles.length === 1}
                      onClick={() => commit(removeTiles(tiles, only(tile.key)))}
                    />
                  </span>
                )}
              />
              <Button
                variant="solid"
                leftIcon={<Download size={16} />}
                disabled={busy}
                onClick={() => job.run(file, tiles)}
              >
                Apply &amp; download
              </Button>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Building PDF">
            {job.result && job.result.notes.length > 0 && (
              <Alert status="warning">
                <AlertTitle>
                  Saved {job.result.name} with these changes to the document
                </AlertTitle>
                {job.result.notes.map((note, i) => (
                  <AlertDescription key={i}>{note}</AlertDescription>
                ))}
              </Alert>
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default OrganizeTool;
