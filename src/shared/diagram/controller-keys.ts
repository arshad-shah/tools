/**
 * Keyboard model of the diagram canvas (spec §6.8): arrows pan, Tab and
 * Shift+Tab cycle the selection in reading order, Enter selects (or expands
 * a `more` row), [ and ] go to the parent and first child, Alt+Up and
 * Alt+Down go to siblings, Escape clears; + - 0 1 C drive the view.
 */
import type { DiagramController } from './controller';
import { childrenOf, parentOf, readingOrder, siblingOf } from './navigation';

const PAN_STEP = 40;
export const ZOOM_STEP = 1.2;

export interface KeyInput {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

/**
 * Returns true when the key was handled (the host then prevents the
 * default). Tab past the last card is not handled, so focus can leave the
 * canvas.
 */
export function handleKey(c: DiagramController, e: KeyInput): boolean {
  const go = (id: string | null): boolean => {
    if (id === null) return false;
    c.choose(id);
    c.reveal(id);
    return true;
  };

  if (e.ctrlKey || e.metaKey) return false;
  const step = e.shiftKey ? PAN_STEP * 3 : PAN_STEP;
  const sel = c.selectedId;
  switch (e.key) {
    case '+':
    case '=':
      c.zoomBy(ZOOM_STEP);
      return true;
    case '-':
    case '_':
      c.zoomBy(1 / ZOOM_STEP);
      return true;
    case '0':
      c.fit();
      return true;
    case '1':
      c.zoomTo(1);
      return true;
    case 'c':
    case 'C':
      c.centreOn(sel);
      return true;
    case 'Tab': {
      const order = readingOrder(c.cards);
      if (!order.length) return false;
      const i = sel === null ? -1 : order.indexOf(sel);
      const next = e.shiftKey ? (i === -1 ? order.length - 1 : i - 1) : i + 1;
      if (next < 0 || next >= order.length) return false;
      return go(order[next]);
    }
    case 'Enter': {
      if (sel === null) return false;
      const row = c.selectedRow;
      const card = c.card(sel);
      if (row !== null && card?.node.rows[row]?.kind === 'more')
        c.expandMore(sel);
      c.choose(sel, row);
      return true;
    }
    case '[':
      return sel !== null && go(parentOf(c.edges, sel));
    case ']':
      return sel !== null && go(childrenOf(c.edges, sel)[0] ?? null);
    case 'Escape':
      if (sel === null) return false;
      c.choose(null);
      return true;
    case 'ArrowUp':
    case 'ArrowDown':
      if (e.altKey)
        return (
          sel !== null &&
          go(siblingOf(c.edges, sel, e.key === 'ArrowUp' ? -1 : 1))
        );
      c.pan(0, e.key === 'ArrowUp' ? step : -step);
      return true;
    case 'ArrowLeft':
    case 'ArrowRight':
      if (e.altKey) return false;
      c.pan(e.key === 'ArrowLeft' ? step : -step, 0);
      return true;
    default:
      return false;
  }
}
