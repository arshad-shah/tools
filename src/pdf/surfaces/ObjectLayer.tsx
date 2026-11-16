import {
  ButtonBase,
  ContextMenu,
  useDrag,
  VisuallyHidden,
  type MenuEntry,
  type MenuItem,
} from '@arshad-shah/cynosure';
import {
  arrowDown,
  arrowUp,
  bringToFront,
  copy,
  sendToBack,
  sliders,
  trash,
  type as typeIcon,
} from '@arshad-shah/cynosure/icons';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { boxToScreen, toPage, type Viewport } from '@/pdf/doc/geometry';
import type { Box } from '@/pdf/doc/types';
import { PageFrame } from './PageFrame';

/** One placed object the layer lets people pick and change. */
/** On-screen size (CSS px) below which a selection shows no handles. */
const MIN_HANDLES_PX = 32;

export interface LayerObject {
  id: string;
  /** Page-space bounds (PDF points, y up). */
  box: Box;
  /** Degrees, clockwise on screen, about the box centre. */
  rotate?: number;
  /** Accessible name, e.g. "Text box: Hello". */
  label: string;
  /** false: select, delete and the menu only (default true). */
  movable?: boolean;
  /** Default true (and only when movable). */
  resizable?: boolean;
  rotatable?: boolean;
  /** Resizing keeps the aspect ratio (Shift does it for any object). */
  keepAspect?: boolean;
  /** Enter, F2 or a double-click calls onEdit. */
  editable?: boolean;
  /** Default 'overlay-object'. */
  testId?: string;
}

export interface ObjectChange {
  id: string;
  box: Box;
  rotate: number;
}

/** What finished a change: a pointer gesture or a key press. */
export type ChangeSource = 'pointer' | 'keyboard';
export type ObjectOrder = 'front' | 'forward' | 'backward' | 'back';
export type SelectMode = 'replace' | 'toggle' | 'add';

export interface ObjectLayerProps {
  viewport: Viewport;
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
   * pen drag draws a selection rectangle. 'shift': only while Shift is held.
   */
  marquee?: boolean | 'shift';
  'data-testid'?: string;
}

/** Smallest hit target on screen, px. */
const MIN_HIT = 16;
/** Pointer travel before a press is a drag, px. */
const DRAG_START = 3;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const hitRect = (r: Rect): Rect => {
  const w = Math.max(MIN_HIT, r.width);
  const h = Math.max(MIN_HIT, r.height);
  return {
    left: r.left - (w - r.width) / 2,
    top: r.top - (h - r.height) / 2,
    width: w,
    height: h,
  };
};

const intersects = (a: Rect, b: Rect) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

/** The page-space box around all of `boxes`. */
function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.width));
  const t = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: r - x, height: t - y };
}

const abs: CSSProperties = { position: 'absolute' };

/** Room around a frame for its handles and its rotate handle, px. */
const ROOM = 56;

/** A rect grown on every side, wide enough for any turn of the box. */
function around(r: Rect): Rect {
  const d = Math.hypot(r.width, r.height);
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const half = d / 2 + ROOM;
  return { left: cx - half, top: cy - half, width: 2 * half, height: 2 * half };
}

/** The same page drawn with its origin moved by (-dx, -dy). */
const shift = (vp: Viewport, dx: number, dy: number): Viewport => {
  const [a, b, c, d, e, f] = vp.transform;
  return { ...vp, transform: [a, b, c, d, e - dx, f - dy] };
};

/**
 * Placed objects on one page, with one interaction model for every overlay
 * type. Each object is a hit target (Cynosure ButtonBase): a press selects
 * it (Shift adds or removes). The selection is Cynosure's SelectionFrame:
 * drag or arrows move it (every selected object), handles and Alt+arrows
 * resize one object, the rotate handle and [ ] turn it. Delete removes,
 * Enter or a double-click edits, Ctrl+D duplicates, Escape deselects, and a
 * right-click, a long press or Shift+F10 opens the object menu (Cynosure
 * ContextMenu). Each finished gesture or key press is one onCommit.
 */
export function ObjectLayer({
  viewport,
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
  const root = useRef<HTMLDivElement>(null);
  const descId = useId();
  const [live, setLiveState] = useState<Map<string, ObjectChange> | null>(null);
  const [band, setBand] = useState<Rect | null>(null);
  const bandStart = useRef<{ x: number; y: number; additive: boolean } | null>(
    null,
  );
  const [shiftHeld, setShiftHeld] = useState(false);
  useEffect(() => {
    if (marquee !== 'shift') return;
    const on = (e: globalThis.KeyboardEvent) => setShiftHeld(e.shiftKey);
    const off = () => setShiftHeld(false);
    window.addEventListener('keydown', on);
    window.addEventListener('keyup', on);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('keydown', on);
      window.removeEventListener('keyup', on);
      window.removeEventListener('blur', off);
    };
  }, [marquee]);
  const background = marquee === true || shiftHeld || !!band;

  const picked = objects.filter((o) => selected.has(o.id));
  const ids = picked.map((o) => o.id);
  const one = picked.length === 1 ? picked[0] : null;
  const original = (o: LayerObject): ObjectChange => ({
    id: o.id,
    box: o.box,
    rotate: o.rotate ?? 0,
  });

  const shown = (o: LayerObject) => live?.get(o.id) ?? original(o);

  const setLive = (next: Map<string, ObjectChange> | null) => {
    setLiveState(next);
    onPreview?.(next);
  };

  // A new single selection takes the keyboard when nothing else holds it
  // (an editor just closed, a tool placed it), so arrows and Delete work.
  const frameKey = ids.join(' ');
  useEffect(() => {
    if (!frameKey) return;
    const frame = root.current?.querySelector<HTMLElement>(
      '[aria-roledescription="selection"]',
    );
    const active = document.activeElement;
    if (
      frame &&
      (!active || active === document.body || root.current?.contains(active))
    )
      frame.focus({ preventScroll: true });
  }, [frameKey]);

  // ----- selection by pointer -----

  // A press on an object leaves the keyboard with the selection's frame
  // (the browser focuses the pressed button after the press).
  const toFrame = () =>
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>('[aria-roledescription="selection"]')
        ?.focus({ preventScroll: true }),
    );
  const press = (e: PointerEvent<HTMLButtonElement>, o: LayerObject) => {
    toFrame();
    if (e.pointerType === 'mouse' && e.button === 2) {
      if (!selected.has(o.id)) onSelect([o.id], 'replace');
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) onSelect([o.id], selected.has(o.id) ? 'toggle' : 'add');
    else if (!selected.has(o.id)) onSelect([o.id], 'replace');
  };

  // ----- the marquee -----

  const layerPoint = (e: PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const bandDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'touch')
      e.currentTarget.setPointerCapture?.(e.pointerId);
    bandStart.current = { ...layerPoint(e), additive: e.shiftKey };
  };
  const bandMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = bandStart.current;
    if (!s || e.pointerType === 'touch') return;
    const p = layerPoint(e);
    setBand({
      left: Math.min(s.x, p.x),
      top: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y),
    });
  };
  const bandUp = () => {
    const s = bandStart.current;
    bandStart.current = null;
    const r = band;
    setBand(null);
    if (!s) return;
    if (!r || r.width < DRAG_START || r.height < DRAG_START) {
      if (!s.additive && selected.size) onSelect([], 'replace');
      return;
    }
    const hits = objects
      .filter((o) => intersects(r, boxToScreen(viewport, o.box)))
      .map((o) => o.id);
    onSelect(hits, s.additive ? 'add' : 'replace');
  };

  // ----- the frame -----

  const movable = picked.filter((o) => o.movable !== false);
  const group = movable.length ? union(movable.map((o) => o.box)) : null;
  /** The frame's change applied to the selection: one object, or a move of all. */
  const changes = (box: Box, rotate: number): Map<string, ObjectChange> => {
    if (one) return new Map([[one.id, { id: one.id, box, rotate }]]);
    const dx = box.x - group!.x;
    const dy = box.y - group!.y;
    return new Map(
      movable.map((o) => {
        const c = original(o);
        return [
          o.id,
          { ...c, box: { ...c.box, x: c.box.x + dx, y: c.box.y + dy } },
        ] as const;
      }),
    );
  };
  const via = useRef<ChangeSource>('pointer');
  // The frame sits in its own box around the selection (with room for the
  // handles), so the rest of the page stays with what lies under the layer.
  // Its box follows the objects as committed, not a gesture's preview: the
  // frame maps its moves through it.
  const frameBox = one ? shown(one).box : group;
  const restBox = one ? one.box : group;
  const restRect = restBox ? boxToScreen(viewport, restBox) : null;
  const frameRect = restRect ? around(restRect) : null;
  // Cynosure's handles would cover a small object whole, leaving nothing to
  // drag it by (docs/cynosure-gaps.md): below this size the frame shows no
  // handles, and the object moves by dragging and the arrow keys.
  const roomy =
    !!restRect && Math.max(restRect.width, restRect.height) >= MIN_HANDLES_PX;

  // Cynosure 0.6.0's SelectionFrame cannot be moved by dragging its body
  // (docs/cynosure-gaps.md): its own drag gives up at the first move. The
  // frame's box takes the move here instead, through Cynosure's useDrag;
  // handles, keys and rotation stay the frame's.
  const room = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<{ box: Box } | null>(null);
  const latest = useRef({ frameBox, movable: movable.length, changes });
  useEffect(() => {
    latest.current = { frameBox, movable: movable.length, changes };
  });
  useDrag(room, {
    distance: 3,
    onStart: (session) => {
      const onHandle = session.path.some(
        (n) => n instanceof HTMLElement && n.hasAttribute('data-handle'),
      );
      const { frameBox: b, movable: n } = latest.current;
      if (onHandle || !b || !n) return false;
      dragFrom.current = { box: b };
      via.current = 'pointer';
    },
    onMove: ({ delta }) => {
      const from = dragFrom.current;
      if (!from) return;
      const [x0, y0] = toPage(viewport, 0, 0);
      const [x1, y1] = toPage(viewport, delta.x, delta.y);
      const box = {
        ...from.box,
        x: from.box.x + x1 - x0,
        y: from.box.y + y1 - y0,
      };
      setLive(latest.current.changes(box, one ? (one.rotate ?? 0) : 0));
    },
    onEnd: ({ delta }, cancelled) => {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (!from) return;
      if (cancelled) {
        setLive(null);
        return;
      }
      const [x0, y0] = toPage(viewport, 0, 0);
      const [x1, y1] = toPage(viewport, delta.x, delta.y);
      const box = {
        ...from.box,
        x: from.box.x + x1 - x0,
        y: from.box.y + y1 - y0,
      };
      const next = latest.current.changes(box, one ? (one.rotate ?? 0) : 0);
      setLive(null);
      onCommit([...next.values()], 'pointer');
    },
  });

  // ----- keys the frame leaves to the layer -----

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    via.current = 'keyboard';
    const done = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (e.key.startsWith('Arrow') || e.key === '[' || e.key === ']') {
      // The frame moved it; the workspace keys must not page on.
      if (ids.length) e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') {
      if (ids.length) {
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
    const focus = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-object-id]',
    )?.dataset.objectId;
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
      if (one?.editable && onEdit) {
        done();
        onEdit(one.id);
      }
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
    }
  };

  // ----- the object menu -----

  const menuItems = (): MenuEntry[] => {
    const first: MenuItem[] = [];
    if (one?.editable && onEdit)
      first.push({
        value: 'edit',
        label: 'Edit text',
        icon: typeIcon,
        shortcut: 'Enter',
      });
    if (one && onProperties)
      first.push({ value: 'properties', label: 'Properties', icon: sliders });
    if (onDuplicate)
      first.push({
        value: 'duplicate',
        label: 'Duplicate',
        icon: copy,
        shortcut: 'mod+d',
      });
    const out: MenuEntry[] = [];
    if (first.length) out.push({ items: first });
    if (onOrder)
      out.push({
        items: [
          { value: 'front', label: 'Bring to front', icon: bringToFront },
          { value: 'forward', label: 'Bring forward', icon: arrowUp },
          { value: 'backward', label: 'Send backward', icon: arrowDown },
          { value: 'back', label: 'Send to back', icon: sendToBack },
        ],
      });
    out.push({
      items: [
        {
          value: 'delete',
          label: 'Delete',
          icon: trash,
          shortcut: 'Delete',
          tone: 'danger',
        },
      ],
    });
    return out;
  };
  const choose = (value: string) => {
    if (value === 'edit' && one) onEdit?.(one.id);
    else if (value === 'properties' && one) onProperties?.(one.id);
    else if (value === 'duplicate') onDuplicate?.(ids);
    else if (value === 'delete') onDelete(ids);
    else if (onOrder) onOrder(ids, value as ObjectOrder);
  };

  return (
    <ContextMenu
      label="Object actions"
      items={menuItems}
      onSelect={choose}
      disabled={ids.length === 0}
    >
      {(target) => (
        <div
          {...target}
          ref={(el) => {
            root.current = el;
            const r = target.ref;
            if (typeof r === 'function') r(el);
            else if (r) (r as { current: HTMLElement | null }).current = el;
          }}
          role="group"
          aria-label={label}
          data-testid={testId}
          data-object-layer=""
          // The frame commits on its own key handler, before the event
          // bubbles here: note the source on the way down.
          onKeyDownCapture={() => {
            via.current = 'keyboard';
          }}
          onKeyDown={(e) => {
            target.onKeyDown?.(e);
            if (!e.defaultPrevented || e.key.startsWith('Arrow')) onKeyDown(e);
          }}
          onPointerDown={(e) => {
            via.current = 'pointer';
            target.onPointerDown(e);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <VisuallyHidden id={descId}>
            Arrows move, Shift moves further, Alt with arrows resizes, Delete
            removes, Enter edits, Escape deselects, Shift F10 opens the menu.
          </VisuallyHidden>
          {background ? (
            <div
              data-testid="object-layer-background"
              onPointerDown={bandDown}
              onPointerMove={bandMove}
              onPointerUp={bandUp}
              onPointerCancel={() => {
                bandStart.current = null;
                setBand(null);
              }}
              style={{ ...abs, inset: 0, pointerEvents: 'auto' }}
            />
          ) : null}
          {objects.map((o) => {
            const s = shown(o);
            const r = hitRect(boxToScreen(viewport, s.box));
            const on = selected.has(o.id);
            return (
              <ButtonBase
                key={o.id}
                aria-label={o.label}
                pressed={on}
                aria-describedby={descId}
                data-object-id={o.id}
                data-testid={o.testId ?? 'overlay-object'}
                onPointerDown={(e) => press(e, o)}
                onDoubleClick={() => o.editable && onEdit?.(o.id)}
                style={{
                  ...abs,
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                  transform: s.rotate ? `rotate(${s.rotate}deg)` : undefined,
                  margin: 0,
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  touchAction: 'none',
                  pointerEvents: 'auto',
                  cursor: o.movable === false ? 'pointer' : 'move',
                }}
              />
            );
          })}
          {picked.length > 1
            ? picked.map((o) => {
                const r = boxToScreen(viewport, shown(o).box);
                return (
                  <div
                    key={`mark-${o.id}`}
                    aria-hidden
                    data-testid="selection-mark"
                    style={{
                      ...abs,
                      left: r.left,
                      top: r.top,
                      width: r.width,
                      height: r.height,
                      outline: '1px dashed var(--cy-color-accent)',
                    }}
                  />
                );
              })
            : null}
          {group && frameRect ? (
            <div
              ref={room}
              data-testid="selection-frame"
              data-frame-id={ids[0]}
              // The frame lies over its object: a double-click edits it.
              onDoubleClick={() => {
                if (one?.editable) onEdit?.(one.id);
              }}
              style={{
                ...abs,
                left: frameRect.left,
                top: frameRect.top,
                width: frameRect.width,
                height: frameRect.height,
                pointerEvents: 'auto',
                // A finger drags the selection; it does not scroll the page.
                touchAction: 'none',
              }}
            >
              <PageFrame
                key={frameKey}
                label={
                  one ? `Resize ${one.label}` : `${movable.length} objects`
                }
                viewport={shift(viewport, frameRect.left, frameRect.top)}
                box={frameBox}
                rotate={one ? shown(one).rotate : 0}
                resizable={!!one && one.resizable !== false && roomy}
                rotatable={!!one?.rotatable}
                keepAspect={!!one?.keepAspect}
                bounded={false}
                minSize={2}
                aria-describedby={descId}
                onChange={(box, rotate) => setLive(changes(box, rotate))}
                onCommit={(box, rotate) => {
                  const next = changes(box, rotate);
                  setLive(null);
                  onCommit([...next.values()], via.current);
                }}
              />
            </div>
          ) : null}
          {band ? (
            <div
              aria-hidden
              data-testid="selection-band"
              style={{
                ...abs,
                left: band.left,
                top: band.top,
                width: band.width,
                height: band.height,
                border: '1px dashed var(--cy-color-accent)',
                background:
                  'color-mix(in oklab, var(--cy-color-accent) 12%, transparent)',
              }}
            />
          ) : null}
        </div>
      )}
    </ContextMenu>
  );
}
