import type { ContentShapeParams, TextParams } from '@/pdf/doc/ops/edit';
import type { CoverParams } from '@/pdf/doc/ops/cover';
import type { OverlayItem } from '@/pdf/doc/types';

const SHAPES = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
};

/** "Text box: Hello", "Image", "Rectangle", "Cover: New words". */
export function objectLabel(o: OverlayItem): string {
  if (o.type === 'content.text')
    return `Text box: ${(o.params as TextParams).text}`;
  if (o.type === 'content.image') return 'Image';
  if (o.type === 'content.shape')
    return SHAPES[(o.params as ContentShapeParams).kind];
  if (o.type === 'content.cover') {
    const text = (o.params as CoverParams).text;
    return text ? `Cover: ${text}` : 'Cover';
  }
  return 'Object';
}
