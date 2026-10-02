import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { applyEdit, handleEditorKey } from './editor-keys';
import { FindBar } from './find-bar';
import { describeMarker } from './decor';
import {
  alignWrappedRows,
  gutterDigits,
  LINE_HEIGHT,
  PAD_Y,
  rowTop,
  type RowWindow,
} from './layout';
import { FoldRows, GutterColumn, HighlightRows } from './line-view';
import { buildRowMap, lineIndexAt, project, splitLines } from './text-model';
import type { CodeSurfaceProps } from './types';
import { useFind } from './use-find';
import { useHighlight } from './use-highlight';
import { useLineData } from './use-line-data';
import { useViewport } from './use-viewport';
import { useViewSelectAll } from './use-view-select';

/** Up to this many rows everything renders; past it only the visible window. */
export const VIRTUAL_THRESHOLD = 2_000;
/** Read-only text longer than this renders without a textarea (view mode). */
export const TEXTAREA_MAX_LINES = 100_000;
const OVERSCAN = 12;
const NO_LINES: string[] = [];

/**
 * The kit's code editor (spec §5). A transparent textarea (the accessible,
 * native-undo text field) sits over an aria-hidden highlighted line view in
 * the same scroll container, so both scroll together without syncing. Over
 * 2,000 rows only the visible lines (plus overscan) are rendered and
 * tokenised; the textarea still holds the whole text.
 *
 * - `wrap` soft-wraps up to 2,000 rows; longer text stays unwrapped (the
 *   windowing needs fixed row heights).
 * - `folds` present a read-only view: each fold's lines become two empty
 *   rows with a "Show N hidden lines" button; offsets in the API stay
 *   offsets into `value`.
 * - Read-only text over 100,000 lines, and any `source`, renders without a
 *   textarea: the line view itself is a read-only textbox (Mod+A then copy
 *   copies everything).
 * - Tab indents; Escape then Tab moves focus out (no keyboard trap).
 * - Marker columns are 1-based; the first error is announced politely.
 */
export function CodeSurface({
  value,
  onChange,
  language,
  label,
  readOnly = false,
  wrap = false,
  lineNumbers = true,
  lineLabels,
  onScroll: onScrollChange,
  tabSize = 2,
  placeholder,
  onSelectionChange,
  minHeight,
  maxHeight = 480,
  markers,
  lineDecorations,
  ranges,
  folds,
  onUnfold,
  singleLine = false,
  onSubmit,
  source,
  className,
  'aria-describedby': describedBy,
  ref,
}: CodeSurfaceProps) {
  const model = useMemo(
    () => (source ? null : splitLines(value, tabSize)),
    [source, value, tabSize],
  );
  const lineCount = source ? source.count : model!.lines.length;
  const highlight = useHighlight(
    source ? 'plain' : language,
    model?.lines ?? NO_LINES,
  );
  const rows = useMemo(() => buildRowMap(lineCount, folds), [lineCount, folds]);
  const viewMode = !!source || (readOnly && lineCount > TEXTAREA_MAX_LINES);
  const locked = readOnly || rows.hasFolds;
  const projection = useMemo(
    () => (model ? project(model, rows, value) : null),
    [model, rows, value],
  );
  const wrapOn = wrap && !singleLine && rows.count <= VIRTUAL_THRESHOLD;
  const virtual = !wrapOn && rows.count > VIRTUAL_THRESHOLD;
  const showGutter = !singleLine && (lineNumbers || !!markers?.length);

  const {
    scrollTop,
    height: viewHeight,
    elRef: scrollerRef,
    attach,
    scrollTo,
    onScroll,
  } = useViewport(typeof maxHeight === 'number' ? maxHeight : 480);
  let start = 0;
  let end = rows.count;
  if (virtual) {
    start = Math.max(
      0,
      Math.floor((scrollTop - PAD_Y) / LINE_HEIGHT) - OVERSCAN,
    );
    end = Math.min(
      rows.count,
      Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + OVERSCAN,
    );
  }
  const w: RowWindow = { rows, start, end, wrap: wrapOn };

  const find = useFind(value, !!projection);
  const { data, firstError } = useLineData({
    model,
    source,
    highlight,
    ranges,
    find,
    markers,
    lineDecorations,
  });

  const taRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const memory = useRef({ pairAt: -1, tabEscapes: false });
  const [findFocus, setFindFocus] = useState(0);
  const hintId = useId();

  const emit = (next: string) => {
    if (locked) return;
    onChange?.(singleLine ? next.replace(/\r?\n/g, '') : next);
  };
  const caret = () => {
    const ta = taRef.current;
    return ta && projection ? projection.fromView(ta.selectionStart) : 0;
  };

  const scrollToRow = (row: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    let top = rowTop(row);
    if (wrapOn) {
      const node = innerRef.current?.querySelector<HTMLElement>(
        `[data-cs-row="${row}"]`,
      );
      if (node) top = node.offsetTop;
    }
    if (top < el.scrollTop || top + LINE_HEIGHT > el.scrollTop + viewHeight)
      scrollTo(Math.max(0, top - viewHeight / 3));
  };
  const rowOfOffset = (offset: number) =>
    rows.rowOfLine(model ? lineIndexAt(model.starts, offset) : 0);

  useImperativeHandle(ref, () => ({
    focus: () => (taRef.current ?? viewRef.current)?.focus(),
    setSelection(s, e, opts) {
      if (taRef.current && projection)
        taRef.current.setSelectionRange(
          projection.toView(s),
          projection.toView(e),
        );
      if (opts?.scroll !== false) scrollToRow(rowOfOffset(s));
    },
    scrollToLine: (n) => scrollToRow(rows.rowOfLine(n - 1)),
    scrollToPosition({ top, left }) {
      const el = scrollerRef.current;
      if (el && left !== undefined) el.scrollLeft = left;
      if (top !== undefined) scrollTo(top);
    },
  }));

  const openFind = () => {
    if (!projection) return;
    const ta = taRef.current;
    const picked = ta?.value.slice(ta.selectionStart, ta.selectionEnd);
    find.show(picked && !picked.includes('\n') ? picked : undefined, caret());
    setFindFocus((n) => n + 1);
  };
  const closeFind = () => {
    find.close();
    (taRef.current ?? viewRef.current)?.focus();
  };
  useEffect(() => {
    if (!findFocus) return;
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, [findFocus]);

  const reveal = useEffectEvent(() => {
    const m =
      find.open && find.active >= 0
        ? find.result.matches[find.active]
        : undefined;
    if (!m || !projection) return;
    taRef.current?.setSelectionRange(
      projection.toView(m.start),
      projection.toView(m.end),
    );
    scrollToRow(rowOfOffset(m.start));
  });
  useEffect(() => reveal(), [find.nav]);

  const align = useEffectEvent(() => {
    if (wrapOn && innerRef.current) alignWrappedRows(innerRef.current);
  });
  useLayoutEffect(() => align());
  useEffect(() => {
    const el = innerRef.current;
    if (!wrapOn || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => alignWrappedRows(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrapOn]);

  const viewKeys = useViewSelectAll(openFind, () => source?.text?.() ?? value);
  const digits = gutterDigits(lineCount, lineLabels);
  const maxLength = source ? (source.maxLength ?? 80) : model!.maxLength;
  const contentHeight = PAD_Y * 2 + rows.count * LINE_HEIGHT;
  const textClass = 'font-mono text-sm [font-variant-ligatures:none]';

  return (
    <div
      onPointerDown={(e) => {
        // A tap above or below the line of a one-line field still focuses it.
        if (singleLine && e.target === e.currentTarget) {
          e.preventDefault();
          taRef.current?.focus();
        }
      }}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-md border border-line-strong bg-surface-2',
        // A one-line field is a 44px touch target; the line sits centred.
        singleLine && 'justify-center pointer-coarse:min-h-11',
        'has-[[data-cs-input]:focus-visible]:outline-2 has-[[data-cs-input]:focus-visible]:outline-offset-2 has-[[data-cs-input]:focus-visible]:outline-focus',
        className,
      )}
    >
      {find.open ? (
        <FindBar
          find={find}
          caret={caret}
          label={label}
          inputRef={findInputRef}
          onClose={closeFind}
        />
      ) : null}
      <div
        ref={attach}
        data-cs-scroller=""
        onScroll={(e) => {
          onScroll(e);
          const { scrollTop: top, scrollLeft: left } = e.currentTarget;
          onScrollChange?.({ top, left });
        }}
        className={cn(
          'relative min-h-0 overscroll-contain',
          singleLine ? 'flex-none' : 'flex-1',
          singleLine ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto',
        )}
        style={{
          minHeight,
          maxHeight: maxHeight === 'none' ? undefined : maxHeight,
        }}
      >
        <div
          ref={innerRef}
          className={cn('flex', wrapOn ? 'w-full' : 'w-max min-w-full')}
          style={{ minHeight }}
        >
          {showGutter ? (
            <GutterColumn
              w={w}
              data={data}
              lineNumbers={lineNumbers}
              labels={lineLabels}
              digits={digits}
              className={textClass}
            />
          ) : null}
          <div
            ref={viewMode ? viewRef : undefined}
            className={cn(
              'relative min-w-0 flex-1 text-fg',
              textClass,
              viewKeys.selectAll && 'bg-accent-soft',
              viewMode &&
                'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
            )}
            style={{
              minHeight: wrapOn ? undefined : contentHeight,
              minWidth: wrapOn ? undefined : `calc(${maxLength}ch + 24px)`,
              tabSize,
            }}
            {...(viewMode
              ? {
                  role: 'textbox',
                  'aria-readonly': true,
                  'aria-multiline': true,
                  'aria-label': label,
                  'aria-describedby': describedBy,
                  tabIndex: 0,
                  onKeyDown: viewKeys.onKeyDown,
                  onCopy: viewKeys.onCopy,
                  onPointerDown: viewKeys.reset,
                }
              : {})}
          >
            <div
              data-cs-highlight=""
              aria-hidden={viewMode ? undefined : true}
              className={cn(
                wrapOn ? 'relative py-2' : 'absolute inset-0',
                !viewMode && 'pointer-events-none select-none',
              )}
            >
              <HighlightRows w={w} data={data} />
            </div>
            {projection && !viewMode ? (
              <textarea
                ref={taRef}
                data-cs-input=""
                value={projection.text}
                onChange={(e) => emit(e.target.value)}
                onKeyDown={(e) =>
                  handleEditorKey(e, {
                    locked,
                    singleLine,
                    tabSize,
                    language,
                    memory: memory.current,
                    openFind,
                    onSubmit,
                    apply: (edit) => applyEdit(e.currentTarget, edit, emit),
                  })
                }
                onSelect={(e) =>
                  onSelectionChange?.(
                    projection.fromView(e.currentTarget.selectionStart),
                    projection.fromView(e.currentTarget.selectionEnd),
                  )
                }
                readOnly={locked}
                aria-readonly={locked || undefined}
                aria-label={label}
                aria-multiline={!singleLine}
                aria-describedby={
                  cn(describedBy, !locked && !singleLine && hintId) || undefined
                }
                placeholder={placeholder}
                rows={singleLine ? 1 : undefined}
                wrap={wrapOn ? 'soft' : 'off'}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className={cn(
                  'absolute inset-0 z-10 m-0 block size-full resize-none overflow-hidden border-0 bg-transparent px-3 py-2 text-transparent caret-fg outline-none placeholder:text-fg-subtle selection:bg-accent-soft',
                  textClass,
                  wrapOn ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
                )}
                style={{ tabSize }}
              />
            ) : null}
            {rows.hasFolds ? (
              <div className="pointer-events-none absolute inset-0 z-20">
                <FoldRows w={w} onUnfold={onUnfold} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {!locked && !singleLine ? (
        <span id={hintId} className="sr-only">
          Tab indents. Press Escape, then Tab, to move focus out of the editor.
        </span>
      ) : null}
      <div role="status" className="sr-only" data-cs-announcer="">
        {firstError ? describeMarker(firstError) : ''}
      </div>
    </div>
  );
}
CodeSurface.displayName = 'CodeSurface';
