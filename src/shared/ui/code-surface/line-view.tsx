import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '../button';
import { GutterCell } from './gutter';
import { LINE_CLASS } from './decor';
import { LINE_HEIGHT, rowTop, type LineData, type RowWindow } from './layout';
import { LineContent } from './render-line';
import { FOLD_ROWS } from './text-model';
import type { CodeMarker } from './types';

const NO_MARKERS: CodeMarker[] = [];

const fixed = (w: RowWindow, r: number, rows = 1) =>
  w.wrap ? undefined : { top: rowTop(r), height: rows * LINE_HEIGHT };

/** The highlighted text rows (`data-cs-line` is the 1-based line). */
export function HighlightRows({ w, data }: { w: RowWindow; data: LineData }) {
  const out: ReactNode[] = [];
  for (let r = w.start; r < w.end; r++) {
    const line = w.rows.lineAt(r);
    if (line < 0) {
      out.push(
        <div
          key={`f${r}`}
          data-cs-row={r}
          className={cn(w.wrap ? 'min-h-[18px]' : 'absolute inset-x-0')}
          style={fixed(w, r)}
        />,
      );
      continue;
    }
    const text = data.text(line);
    const deco = data.decorations.get(line + 1);
    out.push(
      <div
        key={line}
        data-cs-row={r}
        data-cs-line={line + 1}
        className={cn(
          'px-3',
          w.wrap
            ? 'min-h-[18px] whitespace-pre-wrap break-words'
            : 'absolute inset-x-0 whitespace-pre',
          deco && LINE_CLASS[deco],
        )}
        style={fixed(w, r)}
      >
        <LineContent
          text={text}
          tokens={data.tokens(line)}
          ranges={data.ranges(line, text)}
          markers={data.markers.get(line + 1) ?? NO_MARKERS}
        />
      </div>,
    );
  }
  return <>{out}</>;
}

/** Gutter cells; in wrap mode their tops are copied from the text rows. */
export function GutterRows({
  w,
  data,
  showNumbers,
  labels,
}: {
  w: RowWindow;
  data: LineData;
  showNumbers: boolean;
  labels?: readonly (number | string | null)[];
}) {
  const out: ReactNode[] = [];
  for (let r = w.start; r < w.end; r++) {
    const line = w.rows.lineAt(r);
    if (line < 0) continue;
    const deco = data.decorations.get(line + 1);
    out.push(
      <div
        key={line}
        data-cs-gutter-row={r}
        className={cn(
          'absolute inset-x-0 flex items-start gap-1 pl-1 pr-2',
          // A tinted row darkens the gutter: fg-subtle drops below 4.5:1 on
          // the light diff tints, so decorated numbers use fg-muted.
          deco && [LINE_CLASS[deco], 'text-fg-muted'],
        )}
        style={fixed(w, r) ?? { height: LINE_HEIGHT }}
      >
        <GutterCell
          line={line + 1}
          markers={data.markers.get(line + 1)}
          showNumber={showNumbers}
          label={labels ? (labels[line] ?? null) : undefined}
        />
      </div>,
    );
  }
  return <>{out}</>;
}

/** The sticky gutter column: numbers (or labels) and marker icons. */
export function GutterColumn({
  w,
  data,
  lineNumbers,
  labels,
  digits,
  className,
}: {
  w: RowWindow;
  data: LineData;
  lineNumbers: boolean;
  labels?: readonly (number | string | null)[];
  digits: number;
  className: string;
}) {
  return (
    <div
      data-cs-gutter=""
      className={cn(
        'sticky left-0 z-20 shrink-0 select-none border-r border-line bg-surface-2 text-fg-subtle',
        className,
      )}
      style={{ width: lineNumbers ? `calc(${digits}ch + 28px)` : 24 }}
    >
      <GutterRows w={w} data={data} showNumbers={lineNumbers} labels={labels} />
    </div>
  );
}

/** "Show N hidden lines" buttons over the empty rows a fold leaves. */
export function FoldRows({
  w,
  onUnfold,
}: {
  w: RowWindow;
  onUnfold?(index: number): void;
}) {
  const out: ReactNode[] = [];
  for (let r = Math.max(0, w.start - FOLD_ROWS + 1); r < w.end; r++) {
    const fold = w.rows.foldAt(r);
    if (!fold) continue;
    const count = fold.to - fold.from + 1;
    out.push(
      <div
        key={fold.index}
        data-cs-fold-row={r}
        className="pointer-events-auto absolute inset-x-0 flex items-center gap-3 border-y border-line bg-surface-2 px-3 font-sans"
        style={fixed(w, r, FOLD_ROWS) ?? { height: FOLD_ROWS * LINE_HEIGHT }}
      >
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => onUnfold?.(fold.index)}
        >
          {`Show ${count} hidden ${count === 1 ? 'line' : 'lines'}`}
        </Button>
        {fold.label ? (
          <span className="truncate font-mono text-xs text-fg-subtle">
            {fold.label}
          </span>
        ) : null}
      </div>,
    );
  }
  return <>{out}</>;
}
