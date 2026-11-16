import { IconButton, ListRow, ListRows } from '@arshad-shah/cynosure';
import { download, undo } from '@arshad-shah/cynosure/icons';
import { formatBytes } from '@/shared/lib/format';
import { notSmaller, savingPercent, type BatchRow } from '../lib/batch';
import { dims, formatSaving, statusText } from '../lib/status';

export interface BatchListProps {
  rows: readonly BatchRow[];
  /** The row shown in Compare. */
  selected: string | null;
  onSelect(id: string): void;
  onDownload(id: string): void;
  onKeepOriginal(id: string, keep: boolean): void;
}

/** "1200 x 800 to 600 x 400. 120 KB to 30 KB, saves 75.0%". */
function detail(r: BatchRow): string {
  const size = r.after
    ? `${formatBytes(r.before.bytes)} to ${formatBytes(r.after.bytes)}`
    : formatBytes(r.before.bytes);
  const d = r.after ? `${dims(r.before)} to ${dims(r.after)}` : dims(r.before);
  const saving = r.keepOriginal
    ? ''
    : formatSaving(savingPercent(r.before.bytes, r.after?.bytes));
  return [d, saving ? `${size}, saves ${saving}` : size]
    .filter(Boolean)
    .join('. ');
}

/**
 * One row per file: what it was, what it became and its status. A finished
 * row downloads; one that did not get smaller can keep its original.
 */
export function BatchList({
  rows,
  selected,
  onSelect,
  onDownload,
  onKeepOriginal,
}: BatchListProps) {
  return (
    <ListRows label="Files" divided>
      {rows.map((r) => (
        <ListRow
          key={r.id}
          label={r.name}
          description={detail(r)}
          detail={statusText(r)}
          tone={
            r.status === 'error'
              ? 'danger'
              : notSmaller(r) && !r.keepOriginal
                ? 'warning'
                : undefined
          }
          active={r.id === selected}
          onClick={r.status === 'done' ? () => onSelect(r.id) : undefined}
          actions={
            r.status === 'done' ? (
              <>
                {notSmaller(r) ? (
                  <IconButton
                    icon={undo}
                    size="sm"
                    variant="ghost"
                    aria-pressed={r.keepOriginal}
                    label={`${r.keepOriginal ? 'Use compressed for' : 'Keep original for'} ${r.name}`}
                    onClick={() => onKeepOriginal(r.id, !r.keepOriginal)}
                  />
                ) : null}
                <IconButton
                  icon={download}
                  size="sm"
                  variant="ghost"
                  label={`Download ${r.name}`}
                  onClick={() => onDownload(r.id)}
                />
              </>
            ) : undefined
          }
        />
      ))}
    </ListRows>
  );
}
