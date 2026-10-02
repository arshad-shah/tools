import { useState } from 'react';
import type React from 'react';
import { IconMoreHorizontal } from '@/shared/ui/icons';
import {
  IconButton,
  OverlayLayer,
  PageBox,
  PointerLayer,
  type OverlayTransform,
  type PagePoint,
} from '@/shared/ui';
import { detectionKey } from '@/pdf/doc/detection';
import type { Box } from '@/pdf/doc/types';
import type { ModeProps, PageOverlayProps } from '../types';
import {
  acceptField,
  addField,
  commitValue,
  dismissField,
  fitAspect,
  placeFree,
  placeSignature,
  quarterTurned,
  signatureBoxAt,
  toggles,
} from './actions';
import { boxAnchor } from './anchor';
import { useCells, useViewFields } from './data';
import { DraftBox } from './DraftBox';
import { FieldItem } from './FieldItem';
import { FieldOptions } from './FieldOptions';
import type { ViewField } from './fields';
import { FormNotice } from './FormNotice';
import { NoFieldsHint } from './NoFieldsHint';
import { OverlayTextBar } from './OverlayTextBar';
import { PlacedBlocks } from './PlacedBlocks';
import { PlacedSignatures, SignatureLook } from './PlacedSignatures';
import { snapNear, useSignTargets } from './sign-places';
import { SignTargetsOverlay } from './SignTargetsOverlay';
import { markBox, snapToCell } from './snap';
import { fillSign, useFillSign } from './store';
import { tabOrder } from './tab-order';
import { lastUsed } from './text-style';

const CLICK_TOOLS = new Set(['text', 'tick', 'cross', 'date', 'add-field']);

/** Field order on the page: Tab order first, then suggested fields. */
function pageOrder(all: readonly ViewField[], pageId: string): ViewField[] {
  const ordered = tabOrder(all).filter((f) => f.page.id === pageId);
  const rest = all.filter((f) => f.page.id === pageId && !ordered.includes(f));
  return [...ordered, ...rest];
}

/** The cell a box mostly sits in, inset 1.5pt; else the box itself. */
function snapBox(box: Box, cells: readonly Box[]): Box {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cell = cells.find(
    (c) =>
      cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height,
  );
  return cell
    ? {
        x: cell.x + 1.5,
        y: cell.y + 1.5,
        width: cell.width - 3,
        height: cell.height - 3,
      }
    : box;
}

/**
 * Fill & Sign's page overlay (spec §8.1, §8.5, plan R39): every AcroForm
 * widget, detected field and free text box with its value, inline editing,
 * corrections and text settings; placed signatures; the click-anywhere
 * tools.
 */
export function FieldsOverlay(props: PageOverlayProps) {
  const { page, doc, tool, viewport, width, height, pageNumber } = props;
  const ctx: ModeProps = props;
  const all = useViewFields(doc);
  const focusKey = useFillSign((s) => s.focusKey);
  const menuFor = useFillSign((s) => s.menuFor);
  const resizing = useFillSign((s) => s.resizing);
  const editing = useFillSign((s) => s.editing);
  const showDetected = useFillSign((s) => s.showDetected);
  const placing = useFillSign((s) => s.placing);
  const ready = useFillSign((s) => s.ready);
  const pageKey = detectionKey(page.source, page.index);
  const cells = useFillSign((s) => s.cells[pageKey]) ?? [];
  const clickTool = !!tool.id && CLICK_TOOLS.has(tool.id);
  useCells(
    doc,
    pageKey,
    clickTool || resizing || placing
      ? (doc.sources[page.source]?.docId ?? null)
      : null,
    page.index,
  );
  // The overlay's element, for anchoring popovers to page-space boxes.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const getRoot = () => rootEl;
  const [hover, setHover] = useState<PagePoint | null>(null);
  const [a, b, c, d, e, f] = viewport.transform;
  const transform: OverlayTransform = { a, b, c, d, e, f };
  const quarter = quarterTurned(ctx, page.id);
  const targets = useSignTargets(page);
  /** A signature box at the point, snapped to a place to sign nearby. */
  const placedBox = (p: PagePoint, role: 'signature' | 'initials') =>
    snapNear(targets, page, signatureBoxAt(p, ready[role]!, role, quarter));
  const fields = pageOrder(all, page.id).filter(
    (x) => showDetected || x.origin !== 'detected',
  );

  const activate = (x: ViewField) => {
    fillSign.set({ focusKey: x.key, menuFor: null, barClosed: null });
    if (x.origin === 'free') {
      // Free boxes are objects: select to move, resize, restyle or delete.
      if (x.fillOpId) ctx.selection.selectObjects([x.fillOpId]);
      return;
    }
    if (x.status === 'suggested') {
      if (acceptField(ctx, x)) doc.announce('Field accepted');
      return;
    }
    if (toggles(x)) {
      commitValue(ctx, x, x.filled ? '' : 'yes');
      return;
    }
    if (x.type === 'signature') {
      const sig = ready.signature;
      if (!sig) {
        // Make one first; Place then fills this field.
        fillSign.set({
          panelRole: 'signature',
          dialog: 'signature',
          signTarget: { pageId: page.id, rect: x.rect },
        });
        return;
      }
      placeSignature(
        ctx,
        page.id,
        fitAspect(x.rect, sig.aspect),
        sig,
        'signature',
      );
      return;
    }
    fillSign.set({ editing: x.key });
  };

  const onFieldKey = (x: ViewField) => (ev: React.KeyboardEvent) => {
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      if (x.origin === 'detected') dismissField(ctx, x);
      else if (x.origin === 'free' && x.fillOpId)
        doc.dispatch({
          type: 'object.remove',
          params: { targetId: x.fillOpId },
        });
    } else if (
      x.origin === 'detected' &&
      (ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey))
    ) {
      ev.preventDefault();
      fillSign.set({ menuFor: x.key, focusKey: x.key });
    }
  };

  const onPoint = (p: PagePoint) => {
    if (placing) {
      const sig = ready[placing];
      if (sig) {
        const at = placedBox(p, placing);
        if (placeSignature(ctx, page.id, at.box, sig, placing) && at.target)
          doc.announce(`Snapped to ${at.target.label}`);
      }
      fillSign.set({ placing: null });
      return;
    }
    if (tool.id === 'tick' || tool.id === 'cross')
      placeFree(ctx, page.id, markBox(p), tool.id, 'yes');
    else if (tool.id === 'text' || tool.id === 'date')
      fillSign.set({
        draft: {
          pageId: page.id,
          rect: snapToCell(p, cells).box,
          kind: tool.id,
          style: { ...lastUsed(doc.state.id), comb: 0 },
        },
        barClosed: null,
        typing: null,
      });
    else if (tool.id === 'add-field')
      addField(
        ctx,
        page.id,
        page.index,
        snapBox({ x: p.x - 60, y: p.y - 10, width: 120, height: 20 }, cells),
      );
  };

  return (
    <OverlayLayer
      width={width}
      height={height}
      interactive
      label={`Page ${pageNumber} fields`}
    >
      <div ref={setRootEl} className="pointer-events-none absolute inset-0" />
      {clickTool || placing ? (
        <PointerLayer
          transform={transform}
          cursor={placing ? 'copy' : tool.id === 'text' ? 'text' : 'crosshair'}
          onPoint={onPoint}
          onMove={placing ? setHover : undefined}
          onDrag={
            tool.id === 'add-field'
              ? (box) => addField(ctx, page.id, page.index, snapBox(box, cells))
              : undefined
          }
        />
      ) : null}
      {fields.map((x) => (
        <FieldItem
          key={x.key}
          ctx={ctx}
          field={x}
          all={all}
          transform={transform}
          quarter={quarter}
          snap={(box) => snapBox(box, cells)}
          onActivate={() => activate(x)}
          onKeyDown={onFieldKey(x)}
          onContextMenu={
            x.origin === 'detected'
              ? (ev) => {
                  ev.preventDefault();
                  fillSign.set({ menuFor: x.key, focusKey: x.key });
                }
              : undefined
          }
        />
      ))}
      <DraftBox
        ctx={ctx}
        page={page}
        pageNumber={pageNumber}
        transform={transform}
        quarter={quarter}
      />
      {fields
        .filter(
          (x) =>
            x.key === focusKey &&
            x.origin === 'detected' &&
            editing !== x.key &&
            resizing !== x.key,
        )
        .map((x) => (
          <PageBox
            key={`options-${x.key}`}
            transform={transform}
            box={{
              x: x.rect.x + x.rect.width,
              y: x.rect.y,
              width: 1,
              height: x.rect.height,
            }}
            className="pointer-events-auto flex items-center"
          >
            <IconButton
              label="Field options"
              icon={IconMoreHorizontal}
              size="sm"
              variant="ghost"
              onClick={() => fillSign.set({ menuFor: x.key })}
            />
          </PageBox>
        ))}
      <PlacedSignatures
        ctx={ctx}
        page={page}
        pageNumber={pageNumber}
        transform={transform}
      />
      <PlacedBlocks
        ctx={ctx}
        page={page}
        pageNumber={pageNumber}
        transform={transform}
      />
      <SignTargetsOverlay
        ctx={ctx}
        page={page}
        transform={transform}
        width={width}
        height={height}
      />
      {placing && hover && ready[placing] ? (
        <PageBox
          transform={transform}
          box={placedBox(hover, placing).box}
          className="pointer-events-none opacity-60"
        >
          <SignatureLook preview={ready[placing]!.preview} role={placing} />
        </PageBox>
      ) : null}
      {menuFor
        ? fields
            .filter((x) => x.key === menuFor && x.origin === 'detected')
            .map((x) => (
              <FieldOptions
                key={x.key}
                ctx={ctx}
                field={x}
                fields={all}
                anchor={boxAnchor(getRoot, transform, x.rect)}
              />
            ))
        : null}
      <OverlayTextBar
        ctx={ctx}
        page={page}
        fields={fields}
        transform={transform}
        quarter={quarter}
        root={getRoot}
      />
      {page.id === doc.currentPage ? (
        <>
          <NoFieldsHint ctx={ctx} fields={all} />
          <FormNotice ctx={ctx} />
        </>
      ) : null}
    </OverlayLayer>
  );
}
