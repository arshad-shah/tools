import React from 'react';
import type { DiagramController, Direction } from '@/shared/diagram';
import { isMac } from '@/shared/lib/platform';
import { IconButton, type IconButtonProps } from './button';
import {
  IconActualSize,
  IconDownload,
  IconLayoutLeftRight,
  IconLayoutTopBottom,
  IconLocate,
  IconMap,
  IconMaximize,
  IconZoomIn,
  IconZoomOut,
} from './icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { Tooltip } from './tooltip';

export const EXPORT_SHORTCUT = 'Mod+Shift+E';

export interface DiagramCanvasControlsProps {
  controller: DiagramController;
  direction: Direction;
  minimap: boolean;
  onToggleDirection(): void;
  onToggleMinimap(): void;
  onExportPng(): void;
  onExportSvg(): void;
  exportButton: React.Ref<HTMLButtonElement>;
}

function Control({
  label,
  shortcut,
  icon,
  onClick,
  pressed,
}: {
  label: string;
  shortcut: string;
  icon: IconButtonProps['icon'];
  onClick(): void;
  pressed?: boolean;
}) {
  return (
    <Tooltip content={label} shortcut={shortcut} side="bottom">
      <IconButton
        label={label}
        icon={icon}
        variant="ghost"
        size="sm"
        aria-pressed={pressed}
        onClick={onClick}
      />
    </Tooltip>
  );
}

/** The DiagramCanvas toolbar (spec §6.7): every control has a shortcut. */
export function DiagramCanvasControls({
  controller: c,
  direction,
  minimap,
  onToggleDirection,
  onToggleMinimap,
  onExportPng,
  onExportSvg,
  exportButton,
}: DiagramCanvasControlsProps) {
  const lr = direction === 'LR';
  return (
    <div
      role="group"
      aria-label="Diagram controls"
      className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-lg bg-surface p-1 shadow-e2"
    >
      <Control
        label="Zoom in"
        shortcut="+"
        icon={IconZoomIn}
        onClick={() => c.zoomBy(1.2)}
      />
      <Control
        label="Zoom out"
        shortcut="-"
        icon={IconZoomOut}
        onClick={() => c.zoomBy(1 / 1.2)}
      />
      <Control
        label="Fit to view"
        shortcut="0"
        icon={IconMaximize}
        onClick={() => c.fit()}
      />
      <Control
        label="Actual size"
        shortcut="1"
        icon={IconActualSize}
        onClick={() => c.zoomTo(1)}
      />
      <Control
        label={lr ? 'Lay out top to bottom' : 'Lay out left to right'}
        shortcut="D"
        icon={lr ? IconLayoutTopBottom : IconLayoutLeftRight}
        onClick={onToggleDirection}
      />
      <Control
        label="Minimap"
        shortcut="M"
        icon={IconMap}
        onClick={onToggleMinimap}
        pressed={minimap}
      />
      <Control
        label="Centre on selection"
        shortcut="C"
        icon={IconLocate}
        onClick={() => c.centreOn(c.selectedId)}
      />
      {/* The menu trigger cannot take the tooltip's description link, so
          the shortcut is also exposed through aria-keyshortcuts. */}
      <Tooltip content="Export" shortcut={EXPORT_SHORTCUT} side="bottom">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <IconButton
              ref={exportButton}
              label="Export"
              icon={IconDownload}
              variant="ghost"
              size="sm"
              aria-keyshortcuts={isMac() ? 'Meta+Shift+E' : 'Control+Shift+E'}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onExportPng}>
              Export PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportSvg}>
              Export SVG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </div>
  );
}
