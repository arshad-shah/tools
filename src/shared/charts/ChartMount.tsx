import { forwardRef } from 'react';

/**
 * The element a swift-chart instance attaches to when a page drives the
 * chart imperatively (a strip sized by its parent, such as an AspectRatio,
 * rather than swift-chart React's 200px minimum). It fills its parent.
 * A chart mount point: the one raw element lint allows here.
 */
export const ChartMount = forwardRef<HTMLDivElement>(
  function ChartMount(_, ref) {
    return <div ref={ref} style={{ inlineSize: '100%', blockSize: '100%' }} />;
  },
);
