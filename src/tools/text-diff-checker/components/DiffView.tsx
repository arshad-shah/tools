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
}: {
  surface: Surface;
  label: string;
  language: LanguageId;
  folds: Fold[];
  wrap: boolean;
  onUnfold(i: number): void;
  handle: React.Ref<CodeSurfaceHandle>;
}) {
  return (
    <CodeSurface
      ref={handle}
      value={surface.lines.join('\n')}
      language={language}
      label={label}
      readOnly
      wrap={wrap}
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
 * (spec §8.1) with diff decorations, intraline ranges and folds.
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
      />
      <SurfaceView
        surface={vm.right}
        label={`${names.right}, compared`}
        language={language}
        folds={vm.folds}
        wrap={wrap}
        onUnfold={onUnfold}
        handle={right}
      />
    </Grid>
  );
}
