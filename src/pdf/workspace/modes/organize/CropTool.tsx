import { useState } from 'react';
import { IconRotateCcw } from '@/shared/ui/icons';
import { Button, OverlayLayer, SelectionFrame } from '@/shared/ui';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';

/**
 * The crop tool's page overlay: a frame over the current page, starting at
 * its pending crop or its full view. Each drag or keyboard gesture is one
 * `page.crop` step; Esc while adjusting goes back to where it started.
 */
export function CropTool(props: PageOverlayProps) {
  const { page, doc, tool, viewport, width, height, pageNumber } = props;
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
  const [a, b, c, d, e, f] = viewport.transform;
  return (
    <OverlayLayer
      width={width}
      height={height}
      interactive
      label={`Crop page ${pageNumber}`}
    >
      <SelectionFrame
        transform={{ a, b, c, d, e, f }}
        box={box}
        resizable
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
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<IconRotateCcw size="sm" />}
            onClick={() =>
              doc.dispatch({
                type: 'page.crop',
                params: { pageIds: [page.id], box: full },
              })
            }
          >
            Reset crop
          </Button>
        </div>
      ) : null}
    </OverlayLayer>
  );
}
