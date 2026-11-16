import { useState } from 'react';
import { Button } from '@arshad-shah/cynosure';
import { rotateCcw } from '@arshad-shah/cynosure/icons';
import { Layer, Place } from '@/pdf/surfaces/layers';
import { PageFrame } from '@/pdf/surfaces/PageFrame';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';

const clampTo = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * Keeps a crop area on its page: a move (same size as `prev`) stops at the
 * edge; a resize is cut back to the page.
 */
function fitCrop(next: Box, prev: Box, page: Box): Box {
  const right = page.x + page.width;
  const bottom = page.y + page.height;
  if (next.width === prev.width && next.height === prev.height) {
    const width = Math.min(next.width, page.width);
    const height = Math.min(next.height, page.height);
    return {
      x: clampTo(next.x, page.x, right - width),
      y: clampTo(next.y, page.y, bottom - height),
      width,
      height,
    };
  }
  const x = clampTo(next.x, page.x, right - 1);
  const y = clampTo(next.y, page.y, bottom - 1);
  return {
    x,
    y,
    width: Math.max(1, Math.min(next.x + next.width, right) - x),
    height: Math.max(1, Math.min(next.y + next.height, bottom) - y),
  };
}

/**
 * The crop tool's page overlay: a frame over the current page, starting at
 * its pending crop or its full view. Each drag or keyboard gesture is one
 * `page.crop` step; Esc while adjusting goes back to where it started.
 * The area never leaves the page.
 */
export function CropTool(props: PageOverlayProps) {
  const { page, doc, tool, viewport, pageNumber } = props;
  const geom = doc.pageGeom(page);
  const full: Box = {
    x: geom.view[0],
    y: geom.view[1],
    width: geom.view[2] - geom.view[0],
    height: geom.view[3] - geom.view[1],
  };
  const start = page.crop ?? full;
  const [preview, setPreview] = useState<{ key: string; box: Box } | null>(
    null,
  );
  const key = JSON.stringify(start);
  if (tool.id !== 'crop' || page.id !== doc.currentPage) return null;
  const box = preview?.key === key ? preview.box : start;
  return (
    <Layer aria-label={`Crop page ${pageNumber}`} role="group">
      <PageFrame
        viewport={viewport}
        box={box}
        resizable
        snap={(next) => fitCrop(next, box, full)}
        label={`Crop area of page ${pageNumber}`}
        onChange={(next) => setPreview({ key, box: next })}
        onCommit={(next) => {
          setPreview(null);
          doc.dispatch({
            type: 'page.crop',
            params: { pageIds: [page.id], box: next },
          });
        }}
      />
      {page.crop ? (
        <Place x={8} y={8}>
          <Button
            size="sm"
            variant="solid"
            tone="neutral"
            icon={rotateCcw}
            onClick={() =>
              doc.dispatch({
                type: 'page.crop',
                params: { pageIds: [page.id], box: null },
              })
            }
          >
            Reset crop
          </Button>
        </Place>
      ) : null}
    </Layer>
  );
}
