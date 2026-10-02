/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/ErdView.tsx
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Kit host for the diagram engine (spec §6.7, §6.8): two canvases (main and
 * minimap), a ResizeObserver, a dirty-flag frame loop, worker layout for
 * large diagrams, and the controls toolbar. Interaction state lives in the
 * framework-free DiagramController; this file only wires the DOM to it.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DiagramController,
  MINIMAP_H,
  MINIMAP_W,
  createMeasure,
  describeNode,
  readDiagramTheme,
  toPng,
  toSvg,
  watchTheme,
  type Card,
  type Diagram,
  type Direction,
  type Viewport,
} from '@/shared/diagram';
import { cn } from '@/shared/lib/cn';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { matchesHotkey } from '@/shared/lib/hotkeys';
import { notify } from '@/shared/lib/notify';
import {
  DiagramCanvasControls,
  EXPORT_SHORTCUT,
} from './diagram-canvas-controls';
import { Spinner } from './spinner';
import { ErrorState } from './states';
import { useDiagramLayout } from './use-diagram-layout';

export interface DiagramCanvasHandle {
  fit(): void;
  zoomTo(scale: number): void;
  centreOn(id: string): void;
  exportPng(): Promise<void>;
  exportSvg(): void;
  /** The current viewport (pan and zoom). */
  getView(): Viewport;
}

export interface DiagramLayoutInfo {
  cards: Card[];
  mode: 'tree' | 'layered';
  truncatedPasses: boolean;
}

export interface DiagramCanvasProps {
  diagram: Diagram;
  /** Initial layout direction; `D` toggles it. */
  direction?: Direction;
  selectedId?: string | null;
  selectedRow?: number | null;
  onSelect?: (id: string | null, row?: number) => void;
  /** Search hits: card ids, or `matchKey(id, row)` for rows. */
  matches?: Set<string>;
  onExpandMore?: (id: string) => void;
  /** Initial minimap visibility; `M` toggles it. */
  minimap?: boolean;
  controls?: boolean;
  ariaLabel: string;
  /** Read by screen readers as the canvas description. */
  ariaSummary?: string;
  onLayout?: (info: DiagramLayoutInfo) => void;
  className?: string;
  ref?: React.Ref<DiagramCanvasHandle>;
}

export function DiagramCanvas({
  diagram,
  direction: initialDirection = 'LR',
  selectedId,
  selectedRow,
  onSelect,
  matches,
  onExpandMore,
  minimap: initialMinimap = true,
  controls = true,
  ariaLabel,
  ariaSummary,
  onLayout,
  className,
  ref,
}: DiagramCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLCanvasElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);
  const summaryId = useId();

  // Props seed the toggles; a changed prop resets them (adjusting state
  // while rendering, not in an effect).
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [seenDirection, setSeenDirection] = useState(initialDirection);
  if (seenDirection !== initialDirection) {
    setSeenDirection(initialDirection);
    setDirection(initialDirection);
  }
  const [showMinimap, setShowMinimap] = useState(initialMinimap);
  const [seenMinimap, setSeenMinimap] = useState(initialMinimap);
  if (seenMinimap !== initialMinimap) {
    setSeenMinimap(initialMinimap);
    setShowMinimap(initialMinimap);
  }

  const [theme, setTheme] = useState(readDiagramTheme);
  useEffect(() => watchTheme(() => setTheme(readDiagramTheme())), []);
  const [announcement, setAnnouncement] = useState('');
  const measure = useMemo(
    () => createMeasure({ family: theme.fontFamily }),
    [theme.fontFamily],
  );
  const [c] = useState(() => new DiagramController(theme, measure));

  // Latest callbacks, read by the controller's events.
  const latest = useRef({ onSelect, onExpandMore, onLayout });
  useEffect(() => {
    latest.current = { onSelect, onExpandMore, onLayout };
  });

  useEffect(() => {
    const frame = () => {
      raf.current = 0;
      const ctx = main.current?.getContext('2d');
      if (!ctx) return;
      c.paint(ctx);
      const mctx = mini.current?.getContext('2d');
      if (mctx) c.paintMinimap(mctx);
    };
    c.bind({
      invalidate: () => {
        if (!raf.current) raf.current = requestAnimationFrame(frame);
      },
      select: (id, row) => {
        const card = c.card(id);
        setAnnouncement(card ? describeNode(card.node) : 'Selection cleared');
        if (row === undefined) latest.current.onSelect?.(id);
        else latest.current.onSelect?.(id, row);
      },
      expandMore: (id) => latest.current.onExpandMore?.(id),
    });
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [c]);

  useEffect(() => c.setTheme(theme, measure), [c, theme, measure]);

  // --- layout ---------------------------------------------------------------
  const { result, busy, error } = useDiagramLayout(diagram, direction, theme);
  useEffect(() => {
    const l = result?.layout;
    if (!l) return;
    c.setLayout(l, result.request.opts.direction);
    latest.current.onLayout?.({
      cards: l.cards,
      mode: l.mode,
      truncatedPasses: l.truncatedPasses,
    });
  }, [c, result]);

  useEffect(() => {
    if (selectedId !== undefined) c.setSelection(selectedId, selectedRow);
  }, [c, selectedId, selectedRow]);
  useEffect(() => c.setMatches(matches), [c, matches]);

  // --- sizing and the frame loop -----------------------------------------
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      const cv = main.current;
      if (cv) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;
      }
      const m = mini.current;
      if (m) {
        m.width = Math.round(MINIMAP_W * dpr);
        m.height = Math.round(MINIMAP_H * dpr);
      }
      c.setSize(w, h, dpr);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [c]);
  // The minimap canvas repaints with the next frame once it is shown.
  useEffect(() => c.setView(c.view), [c, showMinimap]);

  // React wheel listeners are passive; zooming must stop the page scrolling.
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      c.wheel(
        e.clientX - r.left,
        e.clientY - r.top,
        e.deltaY,
        e.deltaMode,
        e.ctrlKey,
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [c]);

  // --- actions ----------------------------------------------------------------
  const exportSvg = useCallback(() => {
    const svg = toSvg(c.cards, c.routes, c.theme, 32, c.measure);
    saveBlob(new Blob([svg], { type: 'image/svg+xml' }), 'diagram.svg');
  }, [c]);
  const exportPng = useCallback(async () => {
    try {
      const { blob, scaleUsed } = await toPng(
        { cards: c.cards, routes: c.routes },
        c.theme,
        { measure: c.measure },
      );
      saveBlob(blob, 'diagram.png');
      if (scaleUsed < 2)
        notify.info(
          `The diagram is large, so diagram.png was saved at scale ${scaleUsed}.`,
        );
    } catch (e) {
      notify.error(toToolError(e));
    }
  }, [c]);
  const toggleDirection = () => setDirection((d) => (d === 'LR' ? 'TB' : 'LR'));
  const toggleMinimap = () => setShowMinimap((v) => !v);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => c.fit(),
      zoomTo: (s: number) => c.zoomTo(s),
      centreOn: (id: string) => c.centreOn(id),
      exportPng,
      exportSvg,
      getView: () => c.view,
    }),
    [c, exportPng, exportSvg],
  );

  // --- events ---------------------------------------------------------------
  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    c.pointerDown(e.pointerId, p.x, p.y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    c.pointerMove(e.pointerId, p.x, p.y);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    c.pointerUp(e.pointerId);
  };
  const onMinimap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.type === 'pointermove' && e.buttons === 0) return;
    if (e.type === 'pointerdown')
      e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = local(e);
    c.minimapJump(p.x, p.y);
  };
  const onCanvasKey = (e: React.KeyboardEvent) => {
    if (c.key(e)) {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'd') toggleDirection();
    else if (k === 'm') toggleMinimap();
    else return;
    e.preventDefault();
  };
  const onHostKey = (e: React.KeyboardEvent) => {
    if (!matchesHotkey(e, EXPORT_SHORTCUT)) return;
    e.preventDefault();
    exportButton.current?.click();
  };

  return (
    <div
      ref={host}
      className={cn(
        'relative h-full min-h-48 w-full overflow-hidden bg-canvas',
        className,
      )}
      onKeyDown={onHostKey}
    >
      <canvas
        ref={main}
        data-testid="diagram-canvas"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={ariaSummary ? summaryId : undefined}
        tabIndex={0}
        className="block touch-none outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => c.pointerLeave()}
        onKeyDown={onCanvasKey}
      />
      {ariaSummary ? (
        <p id={summaryId} className="sr-only">
          {ariaSummary}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {controls ? (
        <DiagramCanvasControls
          controller={c}
          direction={direction}
          minimap={showMinimap}
          onToggleDirection={toggleDirection}
          onToggleMinimap={toggleMinimap}
          onExportPng={() => void exportPng()}
          onExportSvg={exportSvg}
          exportButton={exportButton}
        />
      ) : null}
      <canvas
        ref={mini}
        data-testid="diagram-minimap"
        aria-hidden="true"
        hidden={!showMinimap}
        className="absolute right-2 bottom-2 z-10 cursor-pointer touch-none rounded-md bg-surface shadow-e2"
        style={{ width: MINIMAP_W, height: MINIMAP_H }}
        onPointerDown={onMinimap}
        onPointerMove={onMinimap}
      />
      {busy ? (
        <div className="absolute top-3 left-3 z-10">
          <Spinner label="Laying out the diagram" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <ErrorState error={error} title="Could not draw this diagram" />
        </div>
      ) : null}
    </div>
  );
}
