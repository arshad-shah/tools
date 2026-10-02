import { useImperativeHandle, useRef } from 'react';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { CodeSurface, Grid, type CodeSurfaceHandle } from '@/shared/ui';
import type { Fold, Surface, ViewModel } from '../lib/view-model';

export interface DiffViewHandle {
  /** Scrolls every surface to 1-based row `n`. */
  scrollToRow(n: number): void;
}

interface DiffViewProps {
  vm: ViewModel;
  language: LanguageId;
  names: { left: string; right: string };
  wrap: boolean;
  /** Called with the fold's stable index (`Fold.index`). */
  onUnfold(index: number): void;
  ref?: React.Ref<DiffViewHandle>;
}

type ScrollPos = { top: number; left: number };

const foldsOf = (folds: Fold[]) =>
  folds.map((f) => ({ fromLine: f.fromLine, toLine: f.toLine, label: '' }));

function SurfaceView({
  surface,
  label,
  language,
  folds,
  wrap,
  onUnfold,
  handle,
  onScroll,
}: {
  surface: Surface;
  label: string;
  language: LanguageId;
  folds: Fold[];
  wrap: boolean;
  onUnfold(i: number): void;
  handle: React.Ref<CodeSurfaceHandle>;
  onScroll?(pos: ScrollPos): void;
}) {
  return (
    <CodeSurface
      ref={handle}
      value={surface.lines.join('\n')}
      language={language}
      label={label}
      readOnly
      wrap={wrap}
      lineLabels={surface.numbers}
      onScroll={onScroll}
      lineDecorations={surface.decorations}
      ranges={surface.ranges}
      folds={foldsOf(folds)}
      onUnfold={(i) => onUnfold(folds[i].index)}
      maxHeight={560}
    />
  );
}

/**
 * Split (two aligned read-only surfaces), unified and inline views
 * (spec §8.1) with diff decorations, intraline ranges and folds. The gutter
 * shows original line numbers (blank on alignment padding) and the split
 * sides scroll together, rows being aligned one for one.
 */
export function DiffView({
  vm,
  language,
  names,
  wrap,
  onUnfold,
  ref,
}: DiffViewProps) {
  const left = useRef<CodeSurfaceHandle>(null);
  const right = useRef<CodeSurfaceHandle>(null);
  // The position last pushed to each side, so its echo is not pushed back.
  const pushed = useRef<{ left?: ScrollPos; right?: ScrollPos }>({});
  const onLeftScroll = (pos: ScrollPos) => {
    const echo = pushed.current.left;
    if (echo && echo.top === pos.top && echo.left === pos.left) return;
    pushed.current.right = pos;
    right.current?.scrollToPosition(pos);
  };
  const onRightScroll = (pos: ScrollPos) => {
    const echo = pushed.current.right;
    if (echo && echo.top === pos.top && echo.left === pos.left) return;
    pushed.current.left = pos;
    left.current?.scrollToPosition(pos);
  };
  useImperativeHandle(ref, () => ({
    scrollToRow(n) {
      left.current?.scrollToLine(n);
      right.current?.scrollToLine(n);
    },
  }));
  if (!vm.right)
    return (
      <SurfaceView
        surface={vm.left}
        label={`Differences between ${names.left} and ${names.right}`}
        language={language}
        folds={vm.folds}
        wrap={wrap}
        onUnfold={onUnfold}
        handle={left}
      />
    );
  return (
    <Grid cols={2} gap="2" className="min-w-0">
      <SurfaceView
        surface={vm.left}
        label={`${names.left}, compared`}
        language={language}
        folds={vm.folds}
        wrap={wrap}
        onUnfold={onUnfold}
        handle={left}
        onScroll={onLeftScroll}
      />
      <SurfaceView
        surface={vm.right}
        label={`${names.right}, compared`}
        language={language}
        folds={vm.folds}
        wrap={wrap}
        onUnfold={onUnfold}
        handle={right}
        onScroll={onRightScroll}
      />
    </Grid>
  );
}
