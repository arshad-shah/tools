import { IconButton, Inline, Menu } from '@arshad-shah/cynosure';
import { moreHorizontal, zoomIn, zoomOut } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { useToolCommands } from '@/shared/lib/tool-commands';

interface GraphControlsProps {
  /** Moves the view by a fraction of its width (negative: left). */
  onPan(fraction: number): void;
  /** Scales the view about its centre (below 1: zoom in). */
  onZoom(factor: number): void;
  onReset(): void;
}

const ZOOM = 1.5;

/**
 * The graph's view controls: zoom out and in up front (drag pans and the
 * wheel zooms on the plot itself); panning by a step and resetting the view
 * in a More menu. Every one is also in the Mod+K palette.
 */
export const GraphControls: React.FC<GraphControlsProps> = ({
  onPan,
  onZoom,
  onReset,
}) => {
  useToolCommands('calculator', [
    {
      id: 'graph-zoom-in',
      label: 'Zoom the graph in',
      run: () => onZoom(1 / ZOOM),
    },
    {
      id: 'graph-zoom-out',
      label: 'Zoom the graph out',
      run: () => onZoom(ZOOM),
    },
    {
      id: 'graph-pan-left',
      label: 'Pan the graph left',
      run: () => onPan(-0.25),
    },
    {
      id: 'graph-pan-right',
      label: 'Pan the graph right',
      run: () => onPan(0.25),
    },
    { id: 'graph-reset', label: 'Reset the graph view', run: onReset },
  ]);
  return (
    <Inline gap="1" role="group" aria-label="Pan and zoom">
      <IconButton
        size="sm"
        variant="ghost"
        tone="neutral"
        icon={zoomOut}
        label="Zoom out"
        onClick={() => onZoom(ZOOM)}
      />
      <IconButton
        size="sm"
        variant="ghost"
        tone="neutral"
        icon={zoomIn}
        label="Zoom in"
        onClick={() => onZoom(1 / ZOOM)}
      />
      <Menu
        label="More view controls"
        placement="bottom"
        align="end"
        items={[
          { value: 'left', label: 'Pan left' },
          { value: 'right', label: 'Pan right' },
          { value: 'reset', label: 'Reset view' },
        ]}
        onSelect={(v) => {
          if (v === 'left') onPan(-0.25);
          else if (v === 'right') onPan(0.25);
          else onReset();
        }}
        trigger={(props) => (
          <IconButton
            {...props}
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={moreHorizontal}
            label="More view controls"
          />
        )}
      />
    </Inline>
  );
};
