/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/ErdView.tsx
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * The interaction state behind the DiagramCanvas host, framework-free:
 * viewport, selection, hover, pointer pan and card drag (with reroute),
 * pinch and wheel zoom, keyboard navigation and painting. The host owns the
 * DOM (canvases, observers, the frame loop) and forwards events here.
 */
import type { DiagramLayout } from './layout-core';
import type { Direction } from './layout';
import type { Card, Measure } from './metrics';
import type { DiagramEdge } from './model';
import { MINIMAP_H, MINIMAP_W, minimapToWorld, paintMinimap } from './minimap';
import { handleKey, type KeyInput } from './controller-keys';
import { paint } from './paint';
import { route, type EndMarker, type Route } from './route';
import { SpatialIndex } from './spatial-index';
import type { DiagramTheme } from './theme-bridge';
import {
  centreOn,
  fitToView,
  identity,
  pickRow,
  toWorldX,
  toWorldY,
  zoomAt,
  type Viewport,
} from './viewport';

export interface ControllerEvents {
  /** Something changed: schedule a repaint. */
  invalidate(): void;
  /** The user picked a card (and a row), or cleared the selection. */
  select(id: string | null, row?: number): void;
  /** The user activated a `more` row. */
  expandMore(id: string): void;
  /** The viewport moved; `user` when a pan, pinch, wheel or minimap did it. */
  view?(view: Viewport, user: boolean): void;
}

/** Pixels a pointer may wander before a press becomes a drag. */
const DRAG_SLOP = 3;

interface Drag {
  card: Card | null;
  row: number | null;
  x: number;
  y: number;
  moved: boolean;
}

export class DiagramController {
  cards: Card[] = [];
  routes: Route[] = [];
  edges: DiagramEdge[] = [];
  index = SpatialIndex.build([], []);
  view: Viewport = identity();
  size = { w: 0, h: 0 };
  dpr = 1;
  selectedId: string | null = null;
  selectedRow: number | null = null;
  hoveredId: string | null = null;
  hoveredRow: number | null = null;
  matches: Set<string> | undefined;
  related: Set<string> | undefined;
  direction: Direction = 'LR';
  marker: EndMarker = 'dot';

  private fitted = false;
  private stale = false;
  private drag: Drag | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: number | null = null;

  constructor(
    public theme: DiagramTheme,
    public measure: Measure,
    private events: ControllerEvents = {
      invalidate: () => {},
      select: () => {},
      expandMore: () => {},
    },
  ) {}

  /** Connect the host's callbacks (repaint scheduling, selection). */
  bind(events: ControllerEvents): void {
    this.events = events;
    this.invalidate();
  }

  setTheme(theme: DiagramTheme, measure: Measure): void {
    this.theme = theme;
    this.measure = measure;
    this.invalidate();
  }

  private invalidate() {
    this.events.invalidate();
  }

  setLayout(l: DiagramLayout, direction: Direction = this.direction): void {
    this.direction = direction;
    this.cards = l.cards;
    this.routes = l.routes;
    this.edges = l.edges;
    this.index = SpatialIndex.build(this.cards, this.routes);
    this.fitted = false;
    this.related = this.relatedTo(this.selectedId);
    this.maybeFit();
    this.invalidate();
  }

  setSize(w: number, h: number, dpr: number): void {
    this.size = { w, h };
    this.dpr = dpr;
    this.maybeFit();
    this.invalidate();
  }

  /** Fit once per layout, as soon as the host has a real size. */
  private maybeFit() {
    if (this.fitted || this.size.w <= 1 || !this.cards.length) return;
    this.fitted = true;
    this.fit();
  }

  card(id: string | null): Card | undefined {
    return id === null ? undefined : this.cards.find((c) => c.id === id);
  }

  setView(v: Viewport, user = false): void {
    this.view = v;
    this.events.view?.(v, user);
    this.invalidate();
  }

  fit(): void {
    this.setView(fitToView(this.cards, this.size.w, this.size.h));
  }

  zoomBy(factor: number): void {
    this.setView(zoomAt(this.view, this.size.w / 2, this.size.h / 2, factor));
  }

  zoomTo(scale: number): void {
    this.zoomBy(scale / this.view.scale);
  }

  centreOn(id: string | null): void {
    const c = this.card(id);
    if (c) this.setView(centreOn(this.view, c, this.size));
  }

  /** Centre on a card only when part of it is outside the viewport. */
  reveal(id: string): void {
    const c = this.card(id);
    if (!c) return;
    const v = this.view;
    const x = c.x * v.scale + v.x;
    const y = c.y * v.scale + v.y;
    const inside =
      x >= 0 &&
      y >= 0 &&
      x + c.w * v.scale <= this.size.w &&
      y + c.h * v.scale <= this.size.h;
    if (!inside) this.centreOn(id);
  }

  pan(dx: number, dy: number): void {
    this.setView(
      { ...this.view, x: this.view.x + dx, y: this.view.y + dy },
      true,
    );
  }

  private relatedTo(id: string | null): Set<string> | undefined {
    if (id === null) return undefined;
    const s = new Set<string>();
    for (const e of this.edges) {
      if (e.from === id) s.add(e.to);
      if (e.to === id) s.add(e.from);
    }
    return s;
  }

  setSelection(id: string | null, row: number | null = null): void {
    this.selectedId = id;
    this.selectedRow = id === null ? null : row;
    this.related = this.relatedTo(id);
    this.invalidate();
  }

  /** Select and tell the host. */
  choose(id: string | null, row: number | null = null): void {
    this.setSelection(id, row);
    if (id === null) this.events.select(null);
    else if (row === null) this.events.select(id);
    else this.events.select(id, row);
  }

  setMatches(m: Set<string> | undefined): void {
    this.matches = m;
    this.invalidate();
  }

  hit(x: number, y: number): { card: Card | null; row: number | null } {
    const wx = toWorldX(this.view, x);
    const wy = toWorldY(this.view, y);
    const card = this.index.pickCard(wx, wy);
    return { card, row: card ? pickRow(card, wy) : null };
  }

  pointerDown(id: number, x: number, y: number): void {
    this.pointers.set(id, { x, y });
    if (this.pointers.size === 2) {
      this.pinch = this.spread();
      this.drag = null;
      return;
    }
    const { card, row } = this.hit(x, y);
    this.drag = { card, row, x, y, moved: false };
    if (card) {
      // Bring to front so a dragged card is never painted under a neighbour.
      const i = this.cards.indexOf(card);
      this.cards.splice(i, 1);
      this.cards.push(card);
      this.stale = true;
    }
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  pointerMove(id: number, x: number, y: number): void {
    if (this.pointers.has(id)) this.pointers.set(id, { x, y });
    if (this.pinch !== null && this.pointers.size === 2) {
      const d = this.spread();
      const [a, b] = [...this.pointers.values()];
      this.setView(
        zoomAt(this.view, (a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch),
        true,
      );
      this.pinch = d;
      return;
    }
    const d = this.drag;
    if (!d) {
      const { card, row } = this.hit(x, y);
      const hid = card?.id ?? null;
      if (hid !== this.hoveredId || row !== this.hoveredRow) {
        this.hoveredId = hid;
        this.hoveredRow = row;
        this.invalidate();
      }
      return;
    }
    const dx = x - d.x;
    const dy = y - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
    d.moved = true;
    d.x = x;
    d.y = y;
    if (d.card) {
      d.card.x = Math.round(d.card.x + dx / this.view.scale);
      d.card.y = Math.round(d.card.y + dy / this.view.scale);
      this.stale = true;
      this.invalidate();
    } else {
      this.pan(dx, dy);
    }
  }

  pointerUp(id: number): void {
    this.pointers.delete(id);
    if (this.pinch !== null) {
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    const d = this.drag;
    this.drag = null;
    if (!d || d.moved) return;
    if (!d.card) {
      this.choose(null);
      return;
    }
    const row = d.row;
    if (row !== null && d.card.node.rows[row]?.kind === 'more')
      this.events.expandMore(d.card.id);
    this.choose(d.card.id, row);
  }

  pointerLeave(): void {
    if (this.hoveredId === null) return;
    this.hoveredId = null;
    this.hoveredRow = null;
    this.invalidate();
  }

  /** Wheel zooms about the cursor; ctrl (trackpad pinch) zooms finer. */
  wheel(
    x: number,
    y: number,
    deltaY: number,
    deltaMode: number,
    ctrl: boolean,
  ) {
    const px =
      deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
    const k = ctrl ? 0.01 : 0.0015;
    this.setView(zoomAt(this.view, x, y, Math.exp(-px * k)), true);
  }

  /** Minimap press or drag: centre the view on that world point. */
  minimapJump(x: number, y: number): void {
    if (!this.cards.length) return;
    const { wx, wy } = minimapToWorld(this.cards, x, y);
    const s = this.view.scale;
    this.setView(
      {
        scale: s,
        x: this.size.w / 2 - wx * s,
        y: this.size.h / 2 - wy * s,
      },
      true,
    );
  }

  /** Tell the host a `more` row was activated. */
  expandMore(id: string): void {
    this.events.expandMore(id);
  }

  /** Keyboard handling (spec §6.8); true when the key was used. */
  key(e: KeyInput): boolean {
    return handleKey(this, e);
  }

  /** Reroute after drags, at most once per frame. */
  private refresh() {
    if (!this.stale) return;
    this.stale = false;
    this.routes = route(this.cards, this.edges, {
      marker: this.marker,
      direction: this.direction,
    });
    this.index = SpatialIndex.build(this.cards, this.routes);
  }

  paint(ctx: CanvasRenderingContext2D): { drawnCards: number } {
    this.refresh();
    return paint(ctx, {
      cards: this.cards,
      routes: this.routes,
      index: this.index,
      view: this.view,
      theme: this.theme,
      measure: this.measure,
      width: this.size.w,
      height: this.size.h,
      dpr: this.dpr,
      selectedId: this.selectedId,
      selectedRow: this.selectedRow,
      hoveredId: this.hoveredId,
      hoveredRow: this.hoveredRow,
      related: this.related,
      matches: this.matches,
    });
  }

  paintMinimap(ctx: CanvasRenderingContext2D): void {
    paintMinimap(ctx, this.cards, this.view, this.size, this.theme, this.dpr);
  }
}

export { MINIMAP_W, MINIMAP_H };
