import React from 'react';
import { TextLayer } from 'pdfjs-dist';
import './text-layer.css';
import {
  textLayerViewport,
  type TextLayerCrop,
  type TextLayerGeom,
} from './text-layer-viewport';

export type { TextLayerGeom } from './text-layer-viewport';

/** Positioned text items as the render worker returns them (pdf.js TextContent shape). */
export interface TextLayerItems {
  items: {
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
    hasEOL: boolean;
  }[];
  styles: Record<
    string,
    { ascent: number; descent: number; vertical: boolean; fontFamily: string }
  >;
}

export interface PdfTextLayerHostProps {
  text: TextLayerItems;
  geom: TextLayerGeom;
  /** Pending rotation added to the page's own. */
  rotate: number;
  /** CSS px per point. */
  scale: number;
  /** Pending crop, page space. */
  crop?: TextLayerCrop;
  onSelectionChange?(range: Range | null): void;
  /** Pointer events and text selection only while a text tool is active. */
  selectable: boolean;
  /** e.g. "Page 3 text". */
  label: string;
}

/** The layer's CSS transform for a page rotation (as pdf_viewer.css does it). */
const ROTATE_CSS: Record<number, string | undefined> = {
  0: undefined,
  90: 'rotate(90deg) translateY(-100%)',
  180: 'rotate(180deg) translate(-100%, -100%)',
  270: 'rotate(270deg) translateX(-100%)',
};

const RERENDER_DELAY = 120;

/**
 * pdf.js TextLayer behind the kit: transparent, selectable text over a page
 * slot, kept in the DOM for visible pages so screen readers can read it
 * (spec §13.2). Scale changes re-render after a short pause.
 */
export function PdfTextLayerHost({
  text,
  geom,
  rotate,
  scale,
  crop,
  onSelectionChange,
  selectable,
  label,
}: PdfTextLayerHostProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const vp = textLayerViewport(geom, rotate, scale, crop);
  const [renderScale, setRenderScale] = React.useState(scale);
  const { pageWidth, pageHeight } = vp.rawDims;

  React.useEffect(() => {
    if (scale === renderScale) return;
    const t = setTimeout(() => setRenderScale(scale), RERENDER_DELAY);
    return () => clearTimeout(t);
  }, [scale, renderScale]);

  // Geometry is compared by value: callers may pass fresh objects each render.
  const geomKey = `${geom.view.join(',')}:${geom.rotate}`;
  const cropKey = crop
    ? `${crop.x},${crop.y},${crop.width},${crop.height}`
    : '';
  const latest = React.useRef({ geom, crop });
  React.useEffect(() => {
    latest.current = { geom, crop };
  });
  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // Each render fills its own container. A superseded render is not
    // cancelled (pdf.js throws from its stream pump when a running layer is
    // cancelled); it finishes into a detached node and is dropped.
    const container = document.createElement('div');
    container.className = 'pdf-text-layer-content';
    host.replaceChildren(container);
    const layer = new TextLayer({
      textContentSource: { ...text, lang: null } as never,
      container,
      viewport: textLayerViewport(
        latest.current.geom,
        rotate,
        renderScale,
        latest.current.crop,
      ) as never,
    });
    layer.render().then(
      () => {
        const end = document.createElement('div');
        end.className = 'endOfContent';
        container.append(end);
      },
      () => {},
    );
    return () => container.remove();
  }, [text, geomKey, rotate, renderScale, cropKey]);

  React.useEffect(() => {
    if (!onSelectionChange) return;
    const onChange = () => {
      const container = ref.current;
      const sel = document.getSelection();
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        onSelectionChange(null);
        return;
      }
      const range = sel.getRangeAt(0);
      onSelectionChange(
        container.contains(range.commonAncestorContainer) ? range : null,
      );
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [onSelectionChange]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className="pdf-text-layer"
      data-selectable={selectable ? 'true' : 'false'}
      data-main-rotation={vp.rotation}
      onPointerDown={() => ref.current?.classList.add('selecting')}
      onPointerUp={() => ref.current?.classList.remove('selecting')}
      style={
        {
          width: pageWidth * renderScale,
          height: pageHeight * renderScale,
          transform: ROTATE_CSS[vp.rotation],
          // CSS-scale the last render while a sharper one is pending.
          scale:
            renderScale === scale ? undefined : String(scale / renderScale),
          '--scale-factor': String(renderScale),
          '--total-scale-factor': String(renderScale),
        } as React.CSSProperties
      }
    />
  );
}
PdfTextLayerHost.displayName = 'PdfTextLayerHost';
