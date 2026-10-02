import { useMemo } from 'react';
import { sigFieldTargets, type SignTarget } from '@/pdf/detect';
import { detectionKey } from '@/pdf/doc/detection';
import type { Box, PageRef } from '@/pdf/doc/types';
import type { FormInfo } from '@/pdf/render/form-info';
import type { ModeProps } from '../types';
import { placeSignature } from './actions';
import {
  DEFAULT_LINE_GAP,
  nearestTarget,
  snapPoint,
  snapToTarget,
} from './placement';
import { snapToCell } from './snap';
import { fillSign, useFillSign, type ReadySignature } from './store';
import { lastUsed } from './text-style';

/*
 * Smart placement in the mode (plan H-8): the places to sign on a view
 * page, snapping a signature box to the nearest one, and "Next place to
 * sign" in reading order.
 */

type Role = 'signature' | 'initials';

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/** Unsigned /Sig fields and detected places on one view page (fields win overlaps). */
export function pageSignTargets(
  page: PageRef,
  detected: Record<string, SignTarget[]>,
  forms: Record<string, FormInfo | undefined>,
): SignTarget[] {
  if (page.blank) return [];
  const widgets = (forms[page.source]?.widgets ?? []).filter(
    (w) => w.pageIndex === page.index,
  );
  const fields = sigFieldTargets(widgets);
  const found = (detected[detectionKey(page.source, page.index)] ?? []).filter(
    (t) => !fields.some((f) => overlaps(f.rect, t.rect)),
  );
  return [...fields, ...found];
}

export function useSignTargets(page: PageRef): SignTarget[] {
  const detected = useFillSign((s) => s.signTargets);
  const forms = useFillSign((s) => s.forms);
  return useMemo(
    () => pageSignTargets(page, detected, forms),
    [page, detected, forms],
  );
}

/** Where a signature of this aspect goes on the target. */
export const targetBox = (t: SignTarget, aspect: number): Box =>
  snapToTarget({ aspect }, t, t.lineGap ?? DEFAULT_LINE_GAP);

/**
 * `box` snapped to a signature or initials place within 12pt of its
 * baseline centre, with that place; else `box` itself.
 */
export function snapNear(
  targets: readonly SignTarget[],
  page: PageRef,
  box: Box,
): { box: Box; target: SignTarget | null } {
  const signable = targets.filter((t) => t.kind !== 'date');
  const target = nearestTarget(signable, snapPoint(box), page.index);
  if (!target) return { box, target: null };
  return { box: targetBox(target, box.width / box.height), target };
}

/** Places `sig` on the target, snapped; selects it for keyboard adjustment. */
export function placeAtTarget(
  ctx: ModeProps,
  page: PageRef,
  target: SignTarget,
  sig: ReadySignature,
  role: Role,
): string | null {
  const id = placeSignature(
    ctx,
    page.id,
    targetBox(target, sig.aspect),
    sig,
    role,
  );
  if (id)
    ctx.doc.announce(
      `Placed at ${target.label}. Use the arrow keys to move it.`,
    );
  return id;
}

/** Fetches places to sign for pages detection has not reported this session. */
async function loadAll(ctx: ModeProps): Promise<void> {
  const { doc } = ctx;
  for (const p of doc.view.pages) {
    const key = detectionKey(p.source, p.index);
    const docId = doc.sources[p.source]?.docId;
    if (p.blank || !docId || fillSign.get().signTargets[key]) continue;
    try {
      const { signTargets } = await doc.render.detect(docId, p.index);
      const s = fillSign.get();
      fillSign.set({ signTargets: { ...s.signTargets, [key]: signTargets } });
    } catch {
      // A page that cannot be read has no places to offer; the others still do.
    }
  }
}

/** Every place to sign with its view page, in reading order. */
export function orderedTargets(
  ctx: ModeProps,
): { page: PageRef; target: SignTarget }[] {
  const { signTargets, forms } = fillSign.get();
  return ctx.doc.view.pages.flatMap((page) =>
    pageSignTargets(page, signTargets, forms)
      .sort(
        (a, b) =>
          b.rect.y + b.rect.height - (a.rect.y + a.rect.height) ||
          a.rect.x - b.rect.x,
      )
      .map((target) => ({ page, target })),
  );
}

/** A date place: a draft date box on the line, or in the cell. */
function startDate(ctx: ModeProps, page: PageRef, t: SignTarget): void {
  const style = { ...lastUsed(ctx.doc.state.id), comb: 0 };
  const r = t.rect;
  const rect =
    t.source === 'cell'
      ? snapToCell({ x: r.x + r.width / 2, y: r.y + r.height / 2 }, [r]).box
      : {
          x: r.x + 4,
          y: r.y + 1,
          width: Math.max(40, r.width - 4),
          height: 1.25 * style.size,
        };
  fillSign.set({
    draft: { pageId: page.id, rect, kind: 'date', style },
    barClosed: null,
    typing: null,
  });
  ctx.doc.announce(`Date place: ${t.label}. Type the date and press Enter.`);
}

/**
 * "Next place to sign": the place after the last one visited, in reading
 * order across pages (wrapping); scrolls to it and places the ready
 * signature or initials there, or opens the panel to make one first.
 */
export async function nextPlaceToSign(ctx: ModeProps): Promise<void> {
  await loadAll(ctx);
  const all = orderedTargets(ctx);
  if (!all.length) {
    ctx.doc.announce('No places to sign found');
    return;
  }
  const { signCursor, goToPage, ready } = fillSign.get();
  const at = all.findIndex((x) => x.target.id === signCursor);
  let next = all[(at + 1) % all.length];
  if (at < 0) {
    const pages = ctx.doc.view.pages.map((p) => p.id);
    const from = Math.max(0, pages.indexOf(ctx.doc.currentPage ?? ''));
    next = all.find((x) => pages.indexOf(x.page.id) >= from) ?? all[0];
  }
  const { page, target } = next;
  fillSign.set({ signCursor: target.id });
  goToPage?.(page.id);
  if (target.kind === 'date') {
    startDate(ctx, page, target);
    return;
  }
  const role: Role = target.kind === 'initials' ? 'initials' : 'signature';
  const sig = ready[role];
  if (sig) {
    placeAtTarget(ctx, page, target, sig, role);
    return;
  }
  fillSign.set({
    panelRole: role,
    dialog: 'signature',
    signTarget: { pageId: page.id, rect: target.rect, target },
  });
}
