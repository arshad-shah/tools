import { useEffect, useRef, useState } from 'react';
import type { ObjectChange } from '@/shared/ui';
import { toScreen } from '@/pdf/doc/geometry';
import type { ImageParams } from '@/pdf/doc/ops/edit';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';
import { ensureOverlayFonts } from '../../overlay-fonts';
import { ModeObjectLayer } from '../../objects/ModeObjectLayer';
import {
  focusProperties,
  itemRotation,
  previewItem,
} from '../../objects/object-ops';
import { objectsOn } from '../../objects/useObjectSelection';
import { ContentPreview } from './ContentPreview';
import { objectLabel } from './labels';
import { MarkupPreview } from './MarkupPreview';
import { addCover, addText } from './place';
import { PlaceLayer } from './PlaceLayer';
import { TextPrompt } from './TextPrompt';
import { setEditUi, toolOf, useEditUi } from './ui-store';

const PLACING = new Set(['text', 'image', 'shape', 'cover']);

/** Edit mode on one page: content and markup previews, selection, placement. */
export function EditOverlay(props: PageOverlayProps) {
  const { doc, page, pageNumber, viewport, width, height, selection } = props;
  const ui = useEditUi();
  const tool = toolOf(props.tool.id);
  const slot = useRef<HTMLDivElement>(null);
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const scale = Math.hypot(a, b);
  const [preview, setPreview] = useState<ReadonlyMap<
    string,
    ObjectChange
  > | null>(null);
  const placed = objectsOn(doc, page.id);
  // Content follows a drag live; the op lands on release.
  const items = placed.map((o) => previewItem(o, preview?.get(o.opId), true));
  const index = doc.view.pages.findIndex((p) => p.id === page.id);

  useEffect(() => {
    void ensureOverlayFonts().catch(() => {});
  }, []);

  const prompt = ui.prompt?.pageId === page.id ? ui.prompt : null;
  const anchor = () => {
    const r = slot.current!.getBoundingClientRect();
    const box = prompt!.rect;
    const [x, y] = toScreen(viewport, box.x, box.y);
    return new DOMRect(r.left + x, r.top + y, 1, 1);
  };

  return (
    <div
      ref={slot}
      className="absolute inset-0"
      data-testid={`edit-page-${pageNumber}`}
    >
      <ContentPreview
        items={items}
        transform={t}
        width={width}
        height={height}
        scale={scale}
      />
      <MarkupPreview
        doc={doc}
        page={page}
        pageIndex={index}
        transform={t}
        width={width}
        height={height}
      />
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
          objects={placed.map((o) => ({
            id: o.opId,
            box: (o.params as { rect: Box }).rect,
            rotate: itemRotation(o),
            label: objectLabel(o),
            rotatable: true,
            keepAspect:
              o.type === 'content.image' &&
              (o.params as ImageParams).keepAspect,
            editable: o.type === 'content.text' || o.type === 'content.cover',
          }))}
          onEdit={(id) => {
            selection.selectObjects([id]);
            focusProperties('#edit-text');
          }}
          onProperties={(id) => {
            selection.selectObjects([id]);
            focusProperties();
          }}
        />
      ) : null}
      {PLACING.has(tool) ? (
        <PlaceLayer
          doc={doc}
          page={page}
          pageNumber={pageNumber}
          tool={tool}
          viewport={viewport}
          width={width}
          height={height}
          onPlaced={(id) => {
            selection.selectObjects([id]);
            props.tool.set(null);
          }}
        />
      ) : null}
      {prompt ? (
        <TextPrompt
          prompt={prompt}
          anchor={anchor}
          onCancel={() => setEditUi({ prompt: null })}
          onSave={(text) => {
            const added =
              prompt.kind === 'cover'
                ? addCover(doc, prompt, text)
                : addText(doc, prompt.pageId, prompt.rect, text);
            setEditUi({ prompt: null });
            if (added.length) {
              selection.selectObjects([added[0].id]);
              props.tool.set(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
