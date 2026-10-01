import React, { useState } from 'react';
import { RotateCcw, RotateCw, Trash2, Undo2, Download } from 'lucide-react';
import {
  Alert,
  AlertDescription,
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
  type PageTile,
} from '@/pdf/components';
import {
  initialTiles,
  removeTiles,
  rotateTiles,
  tilesToEdits,
} from './lib/edits';

/** Edits belong to one opened document; a different docId discards them. */
interface EditState {
  docId: string;
  tiles: PageTile[];
  selected: Set<string>;
}

const only = (key: string) => new Set([key]);

const OrganizeTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(async (_ctx, source: LoadedFile, current: PageTile[]) => {
    const bytes = await applyPageEdits(source.bytes, tilesToEdits(current));
    const name = deriveFilename(source.name, 'organized', 'pdf');
    saveBlob(bytes, name, 'application/pdf');
    notify.success(`Saved ${name}`);
    return name;
  });

  const current = doc !== null && edit?.docId === doc.docId ? edit : null;
  const tiles = current
    ? current.tiles
    : doc
      ? initialTiles(doc.pageCount)
      : [];
  const selected = current ? current.selected : new Set<string>();

  const commit = (nextTiles: PageTile[], nextSelected = selected) => {
    if (!doc) return;
    job.reset();
    setEdit({ docId: doc.docId, tiles: nextTiles, selected: nextSelected });
  };
  const select = (nextSelected: Set<string>) => {
    if (!doc) return;
    setEdit({ docId: doc.docId, tiles, selected: nextSelected });
  };

  const toggle = (key: string, mods: { shift: boolean; meta: boolean }) => {
    if (!mods.meta && !mods.shift) {
      select(selected.has(key) && selected.size === 1 ? new Set() : only(key));
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    select(next);
  };

  const dirty =
    doc !== null &&
    JSON.stringify(tiles) !== JSON.stringify(initialTiles(doc.pageCount));

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone
              onFiles={(f) => {
                job.reset();
                setEdit(null);
                setFile(f[0]);
              }}
            />
          ) : (
            <Inline justify="between" align="center" gap="3" wrap>
              <Text weight="semibold">{file.name}</Text>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  job.reset();
                  setEdit(null);
                  setFile(null);
                }}
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
                  disabled={!selected.size}
                  onClick={() => commit(rotateTiles(tiles, selected, -90))}
                >
                  Rotate left
                </Button>
                <Button
                  size="sm"
                  leftIcon={<RotateCw size={14} />}
                  disabled={!selected.size}
                  onClick={() => commit(rotateTiles(tiles, selected, 90))}
                >
                  Rotate right
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 size={14} />}
                  disabled={!selected.size || selected.size >= tiles.length}
                  onClick={() =>
                    commit(removeTiles(tiles, selected), new Set())
                  }
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Undo2 size={14} />}
                  disabled={!dirty}
                  onClick={() => commit(initialTiles(doc.pageCount), new Set())}
                >
                  Reset
                </Button>
              </Inline>
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={selected}
                onToggle={toggle}
                onReorder={(next) => commit(next)}
                renderActions={(tile) => (
                  <span className="flex gap-1">
                    <IconButton
                      label={`Rotate page ${tile.pageIndex + 1} left`}
                      icon={<RotateCcw size={12} />}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        commit(rotateTiles(tiles, only(tile.key), -90))
                      }
                    />
                    <IconButton
                      label={`Rotate page ${tile.pageIndex + 1} right`}
                      icon={<RotateCw size={12} />}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        commit(rotateTiles(tiles, only(tile.key), 90))
                      }
                    />
                    <IconButton
                      label={`Delete page ${tile.pageIndex + 1}`}
                      icon={<Trash2 size={12} />}
                      size="xs"
                      variant="ghost"
                      disabled={tiles.length === 1}
                      onClick={() => {
                        const next = new Set(selected);
                        next.delete(tile.key);
                        commit(removeTiles(tiles, only(tile.key)), next);
                      }}
                    />
                  </span>
                )}
              />
              <Button
                variant="solid"
                leftIcon={<Download size={16} />}
                disabled={job.status === 'running'}
                onClick={() => job.run(file, tiles)}
              >
                Apply &amp; download
              </Button>
            </>
          )}
          <JobPanel
            job={job}
            onCancel={job.cancel}
            runningLabel="Building PDF"
          />
        </Stack>
      </CardBody>
    </Card>
  );
};

export default OrganizeTool;
