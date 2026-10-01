import React, { useCallback, useRef, useState } from 'react';
import { useDraggable, useResizable } from '@arshad-shah/detent-react';
import { Text } from '@/shared/ui';
import { cn } from '@/lib/utils';
import type { VisualRect } from '@/pdf/edit';
import type { DocInfo } from '@/pdf/render';
import { PageThumb } from '@/pdf/components';
import {
  MIN_SIZE_PT,
  moveRect,
  rectFromPixels,
  rectToPixels,
  scaleRect,
} from '../lib/placement';

interface PlacementEditorProps {
  doc: DocInfo;
  pageIndex: number;
  /** null: show the page only (no signature yet). */
  rect: VisualRect | null;
  onRectChange: (r: VisualRect) => void;
  /** Fills the placement box. */
  preview: React.ReactNode;
  /** CSS px. */
  width: number;
  disabled?: boolean;
}

const HANDLES = [
  { name: 'nw', className: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { name: 'ne', className: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { name: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { name: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
] as const;

/**
 * The page with a movable, resizable signature box. React owns the geometry
 * (in points); detent only runs the gesture in progress. Each finished gesture
 * is measured, committed, and the box remounts with fresh detent state so its
 * leftover transform never doubles up with React's left/top.
 */
export const PlacementEditor: React.FC<PlacementEditorProps> = ({
  doc,
  pageIndex,
  rect,
  onRectChange,
  preview,
  width,
  disabled,
}) => {
  const page = doc.pages[pageIndex];
  const scale = width / page.width;
  const frameRef = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  // The remount after a gesture would drop focus; the user just handled the
  // box, so give it focus back (arrow keys then work straight away).
  const refocus = useRef(false);

  const commit = (el: HTMLElement) => {
    const frame = frameRef.current;
    if (!frame) return;
    const f = frame.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    onRectChange(
      rectFromPixels(
        {
          left: b.left - f.left,
          top: b.top - f.top,
          width: b.width,
          height: b.height,
        },
        scale,
        page,
      ),
    );
    refocus.current = true;
    setRevision((n) => n + 1);
  };

  const dragRef = useDraggable({
    bounds: 'parent',
    cancel: '[data-handle]',
    disabled,
    onEnd: (e, cancelled) => {
      if (!cancelled) commit(e.element);
    },
  });
  const resizeRef = useResizable({
    handles: {
      nw: '[data-handle="nw"]',
      ne: '[data-handle="ne"]',
      sw: '[data-handle="sw"]',
      se: '[data-handle="se"]',
    },
    aspectRatio: true,
    minWidth: MIN_SIZE_PT * scale,
    minHeight: MIN_SIZE_PT * scale,
    bounds: 'parent',
    disabled,
    onEnd: (e, cancelled) => {
      if (!cancelled) commit(e.element);
    },
  });
  const boxRef = useCallback(
    (node: HTMLElement | null) => {
      dragRef(node);
      resizeRef(node);
      if (node && refocus.current) {
        refocus.current = false;
        node.focus({ preventScroll: true });
      }
    },
    [dragRef, resizeRef],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!rect || disabled) return;
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    let next: VisualRect | null = null;
    if (moves[e.key]) next = moveRect(rect, ...moves[e.key], page);
    else if (e.key === '+' || e.key === '=') next = scaleRect(rect, 1.05, page);
    else if (e.key === '-') next = scaleRect(rect, 0.95, page);
    if (!next) return;
    e.preventDefault();
    onRectChange(next);
  };

  const round = Math.round;
  return (
    <div className="flex flex-col items-start gap-2">
      <div
        ref={frameRef}
        className="relative inline-block"
        data-testid="placement-frame"
      >
        <PageThumb
          docId={doc.docId}
          pageIndex={pageIndex}
          page={page}
          width={width}
          label={`Page ${pageIndex + 1}`}
        />
        {rect && (
          <div
            key={revision}
            ref={boxRef}
            tabIndex={0}
            role="group"
            aria-label="Signature placement. Arrow keys move it; plus and minus resize it."
            onKeyDown={onKeyDown}
            className={cn(
              'absolute cursor-move outline-dashed outline-2 outline-accent focus-visible:ring-2 focus-visible:ring-accent',
              disabled && 'cursor-default',
            )}
            style={rectToPixels(rect, scale)}
          >
            {preview}
            {HANDLES.map((h) => (
              <span
                key={h.name}
                data-handle={h.name}
                aria-hidden
                className={cn(
                  'absolute size-3 rounded-full border-2 border-surface bg-accent',
                  h.className,
                )}
              />
            ))}
          </div>
        )}
      </div>
      {rect && (
        <Text size="sm" tone="muted" aria-live="polite">
          Position: {round(rect.x)}, {round(rect.y)} pt · Size:{' '}
          {round(rect.width)} × {round(rect.height)} pt
        </Text>
      )}
    </div>
  );
};
