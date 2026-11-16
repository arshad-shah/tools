/** A page's view box and own /Rotate (pdf.js page.view and page.rotate). */
export interface TextLayerGeom {
  view: [number, number, number, number];
  rotate: number;
}

export interface TextLayerCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The plain viewport object pdf.js TextLayer reads (scale, rotation, rawDims). */
export function textLayerViewport(
  geom: TextLayerGeom,
  rotate: number,
  scale: number,
  crop?: TextLayerCrop,
) {
  const [x0, y0, x1, y1] = crop
    ? [crop.x, crop.y, crop.x + crop.width, crop.y + crop.height]
    : geom.view;
  const rotation = (((geom.rotate + rotate) % 360) + 360) % 360;
  return {
    scale,
    rotation,
    rawDims: {
      pageWidth: Math.abs(x1 - x0),
      pageHeight: Math.abs(y1 - y0),
      pageX: Math.min(x0, x1),
      pageY: Math.min(y0, y1),
    },
  };
}
