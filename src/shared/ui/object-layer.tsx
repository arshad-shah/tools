import React from 'react';
import { cn } from '@/shared/lib/cn';
import { ContextMenu, type ContextMenuEntry } from './context-menu';
import {
  IconArrowDown,
  IconArrowUp,
  IconBringToFront,
  IconCopy,
  IconSendToBack,
  IconSettings2,
  IconTrash,
  IconType,
} from './icons';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
  type ScreenRect,
} from './overlay-geometry';
import { OverlayLayer } from './overlay-layer';
import { Positioned } from './positioned';
import {
  angleTo,
  boxesIntersect,
  moveByPointer,
  nudge,
  resizeByKey,
  resizeRotated,
  type HandleName,
} from './selection-math';

/** One placed object the layer lets people pick and change. */
export interface LayerObject {
  id: string;
  /** Page-space bounds. */
  box: PageSpaceBox;
  /** Degrees, clockwise on screen, about the box centre. */
  rotate?: number;
  /** Accessible name, e.g. "Text box: Hello". */
  label: string;
  /** false: select, delete and the menu only (default true). */
  movable?: boolean;
  /** Default true (and only when movable). */
  resizable?: boolean;
  rotatable?: boolean;
  /** Corner handles keep the aspect ratio (Shift does it for any object). */
  keepAspect?: boolean;
  /** Enter, F2 or a double-click calls onEdit. */
  editable?: boolean;
  /** Default 'overlay-object'. */
  testId?: string;
}

export interface ObjectChange {
  id: string;
  box: PageSpaceBox;
  rotate: number;
}

/** What finished a change: a pointer gesture or a key press. */
export type ChangeSource = 'pointer' | 'keyboard';

export type ObjectOrder = 'front' | 'forward' | 'backward' | 'back';

export type SelectMode = 'replace' | 'toggle' | 'add';

export interface ObjectLayerProps {
  transform: OverlayTransform;
  /** CSS px of the page slot. */
  width: number;
  height: number;
  /** e.g. "Objects on page 2". */
  label: string;
  objects: readonly LayerObject[];
  selected: ReadonlySet<string>;
  onSelect(ids: string[], mode: SelectMode): void;
  /** Every change while a gesture runs; null when it ends or is cancelled. */
  onPreview?(changes: ReadonlyMap<string, ObjectChange> | null): void;
  /** A finished gesture or key press: one undo step. */
  onCommit(changes: ObjectChange[], via: ChangeSource): void;
  onDelete(ids: string[]): void;
  onDuplicate?(ids: string[]): void;
  onOrder?(ids: string[], to: ObjectOrder): void;
  onEdit?(id: string): void;
  onProperties?(id: string): void;
  /**
   * The empty page takes part: a click clears the selection and a mouse or
   * pen drag draws a selection rectangle (touch keeps scrolling the page).
   */
  marquee?: boolean;
  'data-testid'?: string;
}

/** Smallest hit target on screen, px. */
const MIN_HIT = 16;
/** Pointer travel before a press becomes a drag, px. */
const DRAG_START = 3;
/** A touch held this long opens the menu, ms. */
const LONG_PRESS = 500;
const LONG_PRESS_SLOP = 8;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Handle hit targets, centred on the frame edge; `out` places a corner
 * fully outside (tiny objects), its dot still on the corner.
 */
const HANDLES: {
  name: HandleName;
  at: string;
  out?: string;
  cursor: string;
}[] = [
  {
    name: 'nw',
    at: 'left-0 top-0',
    out: '-translate-x-full -translate-y-full items-end justify-end',
    cursor: 'cursor-nwse-resize',
  },
  { name: 'n', at: 'left-1/2 top-0', cursor: 'cursor-ns-resize' },
  {
    name: 'ne',
    at: 'left-full top-0',
    out: 'translate-x-0 -translate-y-full items-end justify-start',
    cursor: 'cursor-nesw-resize',
  },
  { name: 'e', at: 'left-full top-1/2', cursor: 'cursor-ew-resize' },
  {
    name: 'se',
    at: 'left-full top-full',
    out: 'translate-x-0 translate-y-0 items-start justify-start',
    cursor: 'cursor-nwse-resize',
  },
  { name: 's', at: 'left-1/2 top-full', cursor: 'cursor-ns-resize' },
  {
    name: 'sw',
    at: 'left-0 top-full',
    out: '-translate-x-full translate-y-0 items-start justify-end',
    cursor: 'cursor-nesw-resize',
  },
  { name: 'w', at: 'left-0 top-1/2', cursor: 'cursor-ew-resize' },
];

/**
 * Below this many px a side keeps its middle free for dragging: no edge
 * handles along it, and corners move outside when both sides are short.
 */
const ROOMY = 48;

type Gesture =
  | {
      kind: 'move';
      ids: string[];
      x: number;
      y: number;
      moved: boolean;
      timer: ReturnType<typeof setTimeout> | null;
    }
  | { kind: 'resize'; id: string; handle: HandleName; x: number; y: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number }
  | {
      kind: 'marquee';
      x: number;
      y: number;
      touch: boolean;
      additive: boolean;
    };

/** A screen rect grown about its centre to at least MIN_HIT on each side. */
function hitRect(r: ScreenRect): ScreenRect {
  const w = Math.max(MIN_HIT, r.width);
  const h = Math.max(MIN_HIT, r.height);
  return {
    left: r.left - (w - r.width) / 2,
    top: r.top - (h - r.height) / 2,
    width: w,
    height: h,
  };
}

/**
 * Placed objects on one page with one interaction model for every overlay
 * type: click selects (Shift adds or removes), dragging moves (every
 * selected object), handles resize (Shift keeps the aspect) and rotate,
 * Delete or Backspace removes, arrows nudge 1pt (Shift 10pt), Alt+arrows
 * resize, [ and ] rotate, Enter or a double-click edits, Esc deselects, and
 * right-click, a long press or Shift+F10 opens the object menu. Each
 * finished gesture or key press is one onCommit. Handles are 44px on touch.
 */
export function ObjectLayer({
  transform: t,
  width,
  height,
  label,
  objects,
  selected,
  onSelect,
  onPreview,
  onCommit,
  onDelete,
  onDuplicate,
  onOrder,
  onEdit,
  onProperties,
  marquee = false,
  'data-testid': testId,
}: ObjectLayerProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const liveRef = React.useRef<Map<string, ObjectChange> | null>(null);
  const [live, setLiveState] = React.useState<Map<string, ObjectChange> | null>(
    null,
  );
  const [band, setBand] = React.useState<ScreenRect | null>(null);
  const [menu, setMenu] = React.useState<{
    at: { x: number; y: number };
    ids: string[];
  } | null>(null);
  const descId = React.useId();

  const byId = new Map(objects.map((o) => [o.id, o]));
  const current = (id: string): ObjectChange => {
    const l = liveRef.current?.get(id);
    if (l) return l;
    const o = byId.get(id)!;
    return { id, box: o.box, rotate: o.rotate ?? 0 };
  };
  const original = (id: string): ObjectChange => {
    const o = byId.get(id)!;
    return { id, box: o.box, rotate: o.rotate ?? 0 };
  };
  const selectedIds = () => [...selected].filter((id) => byId.has(id));

  const setLive = (next: Map<string, ObjectChange> | null) => {
    liveRef.current = next;
    setLiveState(next);
    onPreview?.(next);
  };

  const finish = (commit: boolean, via: ChangeSource = 'pointer') => {
    const changes = liveRef.current;
    setLive(null);
    if (commit && changes && changes.size) onCommit([...changes.values()], via);
  };

  const cancel = () => {
    const g = gesture.current;
    if (g?.kind === 'move' && g.timer) clearTimeout(g.timer);
    gesture.current = null;
    setBand(null);
    if (liveRef.current) setLive(null);
  };

  React.useEffect(
    () => () => {
      const g = gesture.current;
      if (g?.kind === 'move' && g.timer) clearTimeout(g.timer);
    },
    [],
  );

  // A new single selection takes the keyboard when nothing else holds it
  // (an editor just closed, a tool placed it), so arrows and Delete work.
  const only = selected.size === 1 ? [...selected][0] : null;
  React.useEffect(() => {
    if (!only) return;
    const el = root.current?.querySelector<HTMLElement>(
      `[data-object-id="${CSS.escape(only)}"]`,
    );
    const active = document.activeElement;
    if (
      el &&
      (!active || active === document.body || root.current?.contains(active))
    )
      el.focus({ preventScroll: true });
  }, [only]);

  const openMenu = (ids: string[], x: number, y: number) => {
    if (ids.length) setMenu({ ids, at: { x, y } });
  };

  // ----- pointer -----

  const layerPoint = (e: React.PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onObjectDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    o: LayerObject,
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.focus({ preventScroll: true });
    const was = selected.has(o.id);
    let ids: string[];
    if (e.shiftKey) {
      if (was) {
        onSelect([o.id], 'toggle');
        return;
      }
      onSelect([o.id], 'add');
      ids = [...selectedIds(), o.id];
    } else if (was) {
      ids = selectedIds();
    } else {
      onSelect([o.id], 'replace');
      ids = [o.id];
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { clientX: x, clientY: y } = e;
    gesture.current = {
      kind: 'move',
      ids,
      x,
      y,
      moved: false,
      timer:
        e.pointerType === 'touch'
          ? setTimeout(() => {
              gesture.current = null;
              openMenu(ids, x, y);
            }, LONG_PRESS)
          : null,
    };
  };

  const onHandleDown = (
    e: React.PointerEvent<HTMLElement>,
    id: string,
    handle: HandleName | 'rotate',
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (handle === 'rotate') {
      const frame = root.current?.querySelector<HTMLElement>(
        `[data-frame-id="${CSS.escape(id)}"]`,
      );
      const f = frame?.getBoundingClientRect();
      if (!f) return;
      gesture.current = {
        kind: 'rotate',
        id,
        cx: f.left + f.width / 2,
        cy: f.top + f.height / 2,
      };
      return;
    }
    gesture.current = {
      kind: 'resize',
      id,
      handle,
      x: e.clientX,
      y: e.clientY,
    };
  };

  const onBackgroundDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const touch = e.pointerType === 'touch';
    if (!touch) e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = layerPoint(e);
    gesture.current = {
      kind: 'marquee',
      x: p.x,
      y: p.y,
      touch,
      additive: e.shiftKey,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'move') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      const dist = Math.hypot(dx, dy);
      if (g.timer && dist > LONG_PRESS_SLOP) {
        clearTimeout(g.timer);
        g.timer = null;
      }
      if (!g.moved && dist < DRAG_START) return;
      g.moved = true;
      if (g.ids.every((id) => byId.get(id)?.movable === false)) return;
      setLive(
        new Map(
          g.ids
            .filter((id) => byId.get(id)?.movable !== false)
            .map((id) => {
              const s = original(id);
              return [
                id,
                { ...s, box: moveByPointer(t, s.box, dx, dy) },
              ] as const;
            }),
        ),
      );
    } else if (g.kind === 'resize') {
      const o = byId.get(g.id);
      if (!o) return;
      const s = original(g.id);
      setLive(
        new Map([
          [
            g.id,
            {
              ...s,
              box: resizeRotated(
                t,
                s.box,
                g.handle,
                e.clientX - g.x,
                e.clientY - g.y,
                !!o.keepAspect || e.shiftKey,
                s.rotate,
              ),
            },
          ],
        ]),
      );
    } else if (g.kind === 'rotate') {
      const deg = angleTo(g.cx, g.cy, e.clientX, e.clientY);
      const s = original(g.id);
      setLive(
        new Map([
          [
            g.id,
            { ...s, rotate: e.shiftKey ? Math.round(deg / 15) * 15 : deg },
          ],
        ]),
      );
    } else if (!g.touch) {
      const p = layerPoint(e);
      setBand({
        left: Math.min(g.x, p.x),
        top: Math.min(g.y, p.y),
        width: Math.abs(p.x - g.x),
        height: Math.abs(p.y - g.y),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (g.kind === 'move') {
      if (g.timer) clearTimeout(g.timer);
      if (g.moved) finish(true);
      return;
    }
    if (g.kind !== 'marquee') {
      finish(true);
      return;
    }
    const r = band;
    setBand(null);
    if (!r || r.width < DRAG_START || r.height < DRAG_START) {
      if (!g.additive && selected.size) onSelect([], 'replace');
      return;
    }
    const hits = objects
      .filter((o) => boxesIntersect(r, mapBox(t, o.box)))
      .map((o) => o.id);
    onSelect(hits, g.additive ? 'add' : 'replace');
  };

  const pointer = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => cancel(),
  };

  // ----- keyboard -----

  const focusedId = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>('[data-object-id]')?.dataset
      .objectId ?? null;

  const single = () => {
    const ids = selectedIds();
    return ids.length === 1 ? byId.get(ids[0])! : null;
  };

  const menuAtFrame = (ids: string[]) => {
    const el = root.current?.querySelector<HTMLElement>(
      `[data-frame-id="${CSS.escape(ids[0])}"]`,
    );
    const r = el?.getBoundingClientRect();
    if (r) openMenu(ids, r.left, r.bottom);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = selectedIds();
    const focus = focusedId(e);
    const done = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Escape') {
      if (gesture.current || liveRef.current) {
        done();
        cancel();
      } else if (ids.length) {
        done();
        onSelect([], 'replace');
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!ids.length) return;
      done();
      onDelete(ids);
      return;
    }
    if (e.key === ' ' && focus) {
      done();
      onSelect([focus], e.shiftKey ? 'toggle' : 'replace');
      return;
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      if (focus && !selected.has(focus)) {
        done();
        onSelect([focus], 'replace');
        return;
      }
      const one = single();
      if (one?.editable && onEdit) {
        done();
        onEdit(one.id);
      }
      return;
    }
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      const target = ids.length ? ids : focus ? [focus] : [];
      if (!target.length) return;
      done();
      if (!ids.length && focus) onSelect([focus], 'replace');
      menuAtFrame(target);
      return;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === 'd' &&
      onDuplicate &&
      ids.length
    ) {
      done();
      onDuplicate(ids);
      return;
    }
    if ((e.key === '[' || e.key === ']') && ids.length === 1) {
      const one = single();
      if (!one?.rotatable) return;
      done();
      const c = current(one.id);
      setLive(
        new Map([
          [one.id, { ...c, rotate: c.rotate + (e.key === ']' ? 15 : -15) }],
        ]),
      );
      return;
    }
    const dir = ARROWS[e.key];
    const movable = ids.filter((id) => byId.get(id)?.movable !== false);
    if (!dir || !movable.length) return;
    done();
    if (e.altKey) {
      const one = single();
      if (!one || one.resizable === false || one.movable === false) return;
      const c = current(one.id);
      const next = resizeByKey(t, c.box, e.key, step, !!one.keepAspect);
      if (next) setLive(new Map([[one.id, { ...c, box: next }]]));
      return;
    }
    setLive(
      new Map(
        movable.map((id) => {
          const c = current(id);
          return [
            id,
            { ...c, box: nudge(t, c.box, dir[0], dir[1], step) },
          ] as const;
        }),
      ),
    );
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((ARROWS[e.key] || e.key === '[' || e.key === ']') && liveRef.current)
      finish(true, 'keyboard');
  };

  // ----- menu -----

  const menuItems = (ids: string[]): ContextMenuEntry[] => {
    const one = ids.length === 1 ? byId.get(ids[0]) : undefined;
    const out: ContextMenuEntry[] = [];
    if (one?.editable && onEdit)
      out.push({
        id: 'edit',
        label: 'Edit text',
        icon: IconType,
        shortcut: 'Enter',
        onSelect: () => onEdit(one.id),
      });
    if (one && onProperties)
      out.push({
        id: 'properties',
        label: 'Properties',
        icon: IconSettings2,
        onSelect: () => onProperties(one.id),
      });
    if (onDuplicate)
      out.push({
        id: 'duplicate',
        label: 'Duplicate',
        icon: IconCopy,
        shortcut: 'Mod+D',
        onSelect: () => onDuplicate(ids),
      });
    if (onOrder) {
      if (out.length) out.push({ id: 'sep-order', separator: true });
      out.push(
        {
          id: 'front',
          label: 'Bring to front',
          icon: IconBringToFront,
          onSelect: () => onOrder(ids, 'front'),
        },
        {
          id: 'forward',
          label: 'Bring forward',
          icon: IconArrowUp,
          onSelect: () => onOrder(ids, 'forward'),
        },
        {
          id: 'backward',
          label: 'Send backward',
          icon: IconArrowDown,
          onSelect: () => onOrder(ids, 'backward'),
        },
        {
          id: 'back',
          label: 'Send to back',
          icon: IconSendToBack,
          onSelect: () => onOrder(ids, 'back'),
        },
      );
    }
    if (out.length) out.push({ id: 'sep-delete', separator: true });
    out.push({
      id: 'delete',
      label: 'Delete',
      icon: IconTrash,
      shortcut: 'Delete',
      destructive: true,
      onSelect: () => onDelete(ids),
    });
    return out;
  };

  // ----- render -----

  const shown = (o: LayerObject) =>
    live?.get(o.id) ?? { id: o.id, box: o.box, rotate: o.rotate ?? 0 };
  const picked = objects.filter((o) => selected.has(o.id));
  const resizeOne = picked.length === 1 ? picked[0] : null;

  return (
    <OverlayLayer
      width={width}
      height={height}
      label={label}
      interactive={marquee}
      data-testid={testId}
    >
      <div
        ref={root}
        className="absolute inset-0"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <span id={descId} className="sr-only">
          Arrows move, Shift moves further, Alt with arrows resizes, Delete
          removes, Enter edits, Escape deselects, Shift F10 opens the menu.
        </span>
        {marquee ? (
          <div
            className="absolute inset-0"
            data-testid="object-layer-background"
            onPointerDown={onBackgroundDown}
            {...pointer}
          />
        ) : null}
        {objects.map((o) => {
          const s = shown(o);
          const r = hitRect(mapBox(t, s.box));
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-label={o.label}
              aria-pressed={on}
              aria-describedby={descId}
              data-object-id={o.id}
              data-testid={o.testId ?? 'overlay-object'}
              onPointerDown={(e) => onObjectDown(e, o)}
              {...pointer}
              onDoubleClick={() => {
                if (o.editable && onEdit) onEdit(o.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                const g = gesture.current;
                if (g?.kind === 'move' && g.timer) clearTimeout(g.timer);
                gesture.current = null;
                const ids = on ? selectedIds() : [o.id];
                if (!on) onSelect([o.id], 'replace');
                openMenu(ids, e.clientX, e.clientY);
              }}
              className={cn(
                'pointer-events-auto absolute touch-none rounded-sm bg-transparent outline-none',
                o.movable === false ? 'cursor-pointer' : 'cursor-move',
                'hover:outline hover:outline-1 hover:outline-accent-indicator',
                'focus-visible:ring-2 focus-visible:ring-focus',
              )}
              style={{
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                transform: s.rotate ? `rotate(${s.rotate}deg)` : undefined,
              }}
            />
          );
        })}
        {picked.map((o) => {
          const s = shown(o);
          const r = mapBox(t, s.box);
          const handles =
            resizeOne === o && o.resizable !== false && o.movable !== false;
          return (
            <Positioned
              key={`frame-${o.id}`}
              x={r.left}
              y={r.top}
              width={r.width}
              height={r.height}
              rotate={s.rotate || undefined}
              data-frame-id={o.id}
              data-testid="selection-frame"
              className="pointer-events-none outline outline-2 outline-accent-indicator"
            >
              {handles
                ? HANDLES.filter((h) => {
                    if (h.name === 'n' || h.name === 's')
                      return r.height >= ROOMY;
                    if (h.name === 'e' || h.name === 'w')
                      return r.width >= ROOMY;
                    return true;
                  }).map((h) => {
                    const tiny = !!h.out && Math.min(r.width, r.height) < ROOMY;
                    return (
                      <span
                        key={h.name}
                        data-handle={h.name}
                        aria-hidden
                        onPointerDown={(e) => onHandleDown(e, o.id, h.name)}
                        {...pointer}
                        className={cn(
                          'pointer-events-auto absolute flex size-6 touch-none pointer-coarse:size-[44px]',
                          tiny
                            ? h.out
                            : '-translate-x-1/2 -translate-y-1/2 items-center justify-center',
                          h.at,
                          h.cursor,
                        )}
                      >
                        <span
                          className={cn(
                            // Decorative: only the handle's own box takes
                            // presses (an overflowing dot would cover the
                            // middle of a tiny object, turning a move into
                            // a resize).
                            'pointer-events-none size-3 rounded-sm border-2 border-accent-indicator bg-surface',
                            // The dot's centre stays on the corner.
                            tiny && '-m-1.5',
                          )}
                        />
                      </span>
                    );
                  })
                : null}
              {resizeOne === o && o.rotatable && o.movable !== false ? (
                <span
                  data-handle="rotate"
                  aria-hidden
                  onPointerDown={(e) => onHandleDown(e, o.id, 'rotate')}
                  {...pointer}
                  className="pointer-events-auto absolute -top-8 left-1/2 flex size-6 -translate-x-1/2 cursor-grab touch-none items-center justify-center pointer-coarse:-top-12 pointer-coarse:size-[44px]"
                >
                  <span className="pointer-events-none size-3 rounded-full border-2 border-accent-indicator bg-surface" />
                </span>
              ) : null}
            </Positioned>
          );
        })}
        {band ? (
          <Positioned
            x={band.left}
            y={band.top}
            width={band.width}
            height={band.height}
            data-testid="selection-band"
            className="pointer-events-none border border-dashed border-accent-indicator bg-accent-soft"
          />
        ) : null}
      </div>
      {menu ? (
        <ContextMenu
          open
          at={menu.at}
          label="Object actions"
          items={menuItems(menu.ids)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </OverlayLayer>
  );
}
ObjectLayer.displayName = 'ObjectLayer';
