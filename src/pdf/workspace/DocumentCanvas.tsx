import { DocumentViewport, type ZoomSetting } from '@/shared/ui';
import type { PageId } from '@/pdf/doc/types';
import type { ModeModule, ModeProps } from './modes/types';
import { displaySize } from './page-display';
import { PageImage } from './PageImage';
import { TiledLayer } from './TiledLayer';
import { TILE_ABOVE_SCALE } from './tile-plan';
import { boxToScreen, pageViewport } from '@/pdf/doc/geometry';
import type { SourceDocs } from './source-docs';

export interface DocumentCanvasProps {
  mode: ModeProps;
  module: ModeModule | null;
  sourceDocs: SourceDocs;
  zoom: ZoomSetting;
  onZoomChange(z: ZoomSetting): void;
  onVisiblePagesChange?(ids: PageId[]): void;
  /** The page with the largest visible area. */
  onCurrentPageChange?(id: PageId | null): void;
  onScaleChange?(scale: number): void;
  scrollToPage?: { id: PageId; nonce: number };
}

/**
 * The scrolling document (spec §6.1 canvas): one slot per page sized from
 * the page map, the page's bitmap, and the active mode's overlay on top.
 */
export function DocumentCanvas({
  mode,
  module,
  sourceDocs,
  zoom,
  onZoomChange,
  onVisiblePagesChange,
  onCurrentPageChange,
  onScaleChange,
  scrollToPage,
}: DocumentCanvasProps) {
  const { view, state } = mode.doc;
  const Overlay = module?.PageOverlay;
  const pages = view.pages.map((p) => ({
    id: p.id,
    ...displaySize(p, state.sources),
  }));
  return (
    <DocumentViewport
      label="Document"
      pages={pages}
      zoom={zoom}
      onZoomChange={onZoomChange}
      onVisiblePagesChange={onVisiblePagesChange}
      onCurrentPageChange={onCurrentPageChange}
      onScaleChange={onScaleChange}
      scrollToPage={scrollToPage}
      renderPage={({ index, scale, visible, visibleRect }) => {
        const page = view.pages[index];
        const handle = page.blank ? null : sourceDocs.get(page.source);
        const vp = mode.doc.viewport(page, scale);
        const tiled =
          scale > TILE_ABOVE_SCALE && !page.blank && !!handle?.docId;
        // The displayed area within the full page (own rotation, no crop).
        const full = pageViewport(mode.doc.pageGeom(page), 0, scale);
        const crop = page.crop
          ? boxToScreen(full, page.crop)
          : { left: 0, top: 0, width: full.width, height: full.height };
        return (
          <div className="relative size-full">
            <PageImage
              page={page}
              sources={state.sources}
              docId={handle?.docId ?? null}
              error={handle?.error?.message ?? null}
              scale={scale}
              visible={visible}
              priority={0}
              label={`Page ${index + 1}`}
              maxScale={TILE_ABOVE_SCALE}
            />
            {tiled && visibleRect ? (
              <TiledLayer
                docId={handle.docId!}
                pageIndex={page.index}
                scale={scale}
                shown={{ width: vp.width, height: vp.height }}
                crop={{
                  left: crop.left,
                  top: crop.top,
                  width: crop.width,
                  height: crop.height,
                }}
                rotate={page.rotate}
                visible={visibleRect}
                label={`Page ${index + 1} detail`}
              />
            ) : null}
            {Overlay ? (
              <div className="absolute inset-0">
                <Overlay
                  {...mode}
                  page={page}
                  pageNumber={index + 1}
                  viewport={vp}
                  width={vp.width}
                  height={vp.height}
                />
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
}
