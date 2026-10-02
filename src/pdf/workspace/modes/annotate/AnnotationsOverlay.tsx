import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  HitArea,
  OverlayLayer,
  ShapeLayer,
  type LayerObject,
  type ObjectChange,
} from '@/shared/ui';
import { PdfTextLayerHost } from '@/shared/ui/adapters/PdfTextLayerHost';
import { toScreen } from '@/pdf/doc/geometry';
import { geometryBounds } from '@/pdf/doc/object-geometry';
import type { Box, OverlayItem } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';
import { ModeObjectLayer } from '../../objects/ModeObjectLayer';
import { focusProperties, previewItem } from '../../objects/object-ops';
import { selectionQuads } from '../../selection-quads';
import { ensureOverlayFonts } from '../../overlay-fonts';
import { useGoToMode } from '../../workspace-context';
import { DrawLayer } from './DrawLayer';
import { ExistingLayer } from './ExistingLayer';
import { useExistingAnnotations, usePageText } from './existing';
import {
  existingObject,
  existingUpdate,
  refOfExisting,
} from './existing-objects';
import { NoteEditor } from './NoteEditor';
import { boundsOf, kindName, shapesOf, textOf } from './pending-shapes';
import { FreeTextPreview, StampPreview } from './PendingText';
import { saveEditor } from './save-editor';
import {
  activeTool,
  addAnnotation,
  DRAW_TOOLS,
  existingChanges,
  existingLabel,
  MARKUP_TOOLS,
  pendingAnnots,
} from './tools';
import { getAnnotateUi, setAnnotateUi, useAnnotateUi } from './ui-store';

/** Annotations whose text the editor changes (Enter, double-click). */
const TEXTUAL = new Set(['annot.freetext', 'annot.note']);

/**
 * A pending annotation as a placed object. Frames use the geometry's own
 * bounds (what object.move maps); notes are a fixed-size icon.
 */
function asObject(o: OverlayItem): LayerObject | null {
  const note = o.type === 'annot.note';
  const box = note ? boundsOf(o) : geometryBounds(o.params);
  if (!box) return null;
  const p = o.params as { author: string };
  const body = textOf(o);
  return {
    id: o.opId,
    box,
    label: `${kindName(o)} by ${p.author}${body ? `: ${body}` : ''}`,
    resizable: !note,
    keepAspect: o.type === 'annot.stamp',
    editable: TEXTUAL.has(o.type),
  };
}

/**
 * Annotate mode on one page: the text layer for markup tools, pending
 * annotations drawn with the writers' geometry, existing annotations as
 * hit areas (hidden, deleted or edited ones patched over), the pointer
 * drawing layer and the note editor.
 */
export function AnnotationsOverlay(props: PageOverlayProps) {
  const { doc, page, pageNumber, viewport, width, height, selection } = props;
  const ui = useAnnotateUi();
  const goToMode = useGoToMode();
  const tool = activeTool(props.tool.id);
  const slot = useRef<HTMLDivElement>(null);
  const existing = useExistingAnnotations(doc, page) ?? [];
  const text = usePageText(doc, page);
  const [preview, setPreview] = useState<ReadonlyMap<
    string,
    ObjectChange
  > | null>(null);
  const placed = pendingAnnots(doc, page.id);
  // Annotations follow a drag live; the op lands on release.
  const pending = placed.map((o) => previewItem(o, preview?.get(o.opId)));
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const scale = Math.hypot(a, b);
  const markup = MARKUP_TOOLS[tool];
  // Existing annotations not deleted or hidden, on the object layer too.
  const changes = existingChanges(doc, page.id);
  const movable = ui.hideExisting
    ? []
    : existing.filter((x) => !changes.deleted.has(x.ref));
  const existingOf = (id: string) => {
    const ref = refOfExisting(id);
    return ref ? (movable.find((x) => x.ref === ref) ?? null) : null;
  };
  // The inspector and Delete act on a selected existing annotation.
  const picked = [...selection.objects].map(existingOf).filter((x) => !!x);
  const pickedRef = picked.length === 1 ? picked[0]!.ref : null;
  useEffect(() => {
    const cur = getAnnotateUi().selectedExisting;
    if (pickedRef) {
      const x = existing.find((e) => e.ref === pickedRef)!;
      if (cur?.ref !== pickedRef || cur.pageId !== page.id)
        setAnnotateUi({
          selectedExisting: { pageId: page.id, ref: x.ref, index: x.index },
        });
    } else if (cur?.pageId === page.id)
      setAnnotateUi({ selectedExisting: null });
    // `existing` follows the page; the ref names the annotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedRef, page.id]);

  useEffect(() => {
    void ensureOverlayFonts().catch(() => {});
  }, []);

  const onTextPointerUp = () => {
    if (!markup || !slot.current) return;
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (text && text.items.length === 0)
        setAnnotateUi({ noTextPage: page.id });
      return;
    }
    const range = sel.getRangeAt(0);
    if (!slot.current.contains(range.commonAncestorContainer)) return;
    const quads = selectionQuads(
      [...range.getClientRects()],
      slot.current.getBoundingClientRect(),
      viewport,
    );
    sel.removeAllRanges();
    if (quads.length === 0) return;
    const ui = getAnnotateUi();
    addAnnotation(doc, 'annot.markup', {
      pageId: page.id,
      subtype: markup,
      quads,
      opacity: ui.opacity,
      contents: range.toString().slice(0, 1000),
    });
  };

  const editor = ui.editor?.pageId === page.id ? ui.editor : null;
  const anchorOf = (box: Box) => () => {
    const r = slot.current!.getBoundingClientRect();
    const [x, y] = toScreen(viewport, box.x + box.width, box.y + box.height);
    return new DOMRect(r.left + x, r.top + y, 1, 1);
  };

  return (
    <div
      ref={slot}
      className="absolute inset-0"
      data-testid={`annotate-page-${pageNumber}`}
    >
      <ExistingLayer
        doc={doc}
        page={page}
        list={existing}
        tool={tool}
        viewport={viewport}
        width={width}
        height={height}
        interactive={tool === 'eraser'}
        preview={preview}
      />
      <ShapeLayer
        width={width}
        height={height}
        transform={t}
        shapes={pending.flatMap((o) => shapesOf(o, scale))}
      />
      {pending.map((o) =>
        o.type === 'annot.freetext' ? (
          <FreeTextPreview
            key={o.opId}
            item={o}
            transform={t}
            width={width}
            height={height}
          />
        ) : o.type === 'annot.stamp' ? (
          <StampPreview
            key={o.opId}
            item={o}
            transform={t}
            width={width}
            height={height}
          />
        ) : null,
      )}
      {text && !page.blank ? (
        <div className="absolute inset-0" onPointerUp={onTextPointerUp}>
          <PdfTextLayerHost
            text={text}
            geom={doc.pageGeom(page)}
            rotate={page.rotate}
            scale={scale}
            crop={page.crop}
            selectable={!!markup}
            label={`Page ${pageNumber} text`}
          />
        </div>
      ) : null}
      {tool === 'select' ? (
        <ModeObjectLayer
          doc={doc}
          selection={selection}
          pageNumber={pageNumber}
          viewport={viewport}
          width={width}
          height={height}
          marquee
          onPreview={setPreview}
          objects={[
            ...movable.map((x) => {
              const u = changes.updated.get(x.ref);
              return existingObject(
                x,
                existingLabel({ ...x, ...u }),
                u?.rect ?? x.rect,
              );
            }),
            ...placed.map(asObject).filter((o): o is LayerObject => !!o),
          ]}
          ownOp={(c) => {
            const x = existingOf(c.id);
            return x ? existingUpdate(page.id, x, c.box) : null;
          }}
          onDelete={(ids) => {
            doc.dispatch(
              ids.map((id) => {
                const x = existingOf(id);
                return {
                  type: 'annot.delete',
                  params: {
                    pageId: page.id,
                    target: x
                      ? {
                          kind: 'existing',
                          ref: x.ref,
                          nm: null,
                          index: x.index,
                        }
                      : { kind: 'pending', id },
                  },
                };
              }),
              ids.length > 1 ? `Delete ${ids.length} annotations` : undefined,
            );
            selection.selectObjects([]);
          }}
          onEdit={(id) => {
            const o = placed.find((x) => x.opId === id);
            const box = o && boundsOf(o);
            if (!o || !box) return;
            setAnnotateUi({
              editor: {
                kind: 'edit',
                pageId: page.id,
                at: [box.x, box.y],
                target: { kind: 'pending', id },
                text: textOf(o),
              },
            });
          }}
          onProperties={(id) => {
            selection.selectObjects([id]);
            focusProperties('#annotate-opacity');
          }}
        />
      ) : null}
      {tool === 'eraser' ? (
        <OverlayLayer
          width={width}
          height={height}
          label={`Annotations on page ${pageNumber}`}
        >
          {pending.map((o) => {
            const box = boundsOf(o);
            if (!box) return null;
            return (
              <HitArea
                key={o.opId}
                transform={t}
                box={box}
                label={`Erase ${kindName(o)}`}
                onActivate={() =>
                  doc.dispatch({
                    type: 'annot.delete',
                    params: {
                      pageId: page.id,
                      target: { kind: 'pending', id: o.opId },
                    },
                  })
                }
              />
            );
          })}
        </OverlayLayer>
      ) : null}
      {DRAW_TOOLS.has(tool) ? (
        <DrawLayer
          doc={doc}
          page={page}
          pageNumber={pageNumber}
          tool={tool}
          viewport={viewport}
          width={width}
          height={height}
        />
      ) : null}
      {markup && ui.noTextPage === page.id ? (
        <div className="absolute inset-x-4 top-4">
          <Alert status="info">
            <AlertDescription>
              No text here. Run OCR to make it selectable.
            </AlertDescription>
            {goToMode ? (
              <div className="mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToMode('ocr')}
                >
                  Run OCR
                </Button>
              </div>
            ) : null}
          </Alert>
        </div>
      ) : null}
      {editor ? (
        <NoteEditor
          editor={editor}
          anchor={anchorOf(
            'rect' in editor
              ? editor.rect
              : { x: editor.at[0], y: editor.at[1], width: 20, height: 20 },
          )}
          onCancel={() => setAnnotateUi({ editor: null })}
          onSave={(body) => saveEditor(doc, editor, body)}
        />
      ) : null}
    </div>
  );
}
