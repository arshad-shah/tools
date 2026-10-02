import React from 'react';
import { Button, Popover } from '@/shared/ui';
import type { ToolManifest } from '../../tool';

export interface ToolChooserProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  anchor: React.RefObject<HTMLElement | null>;
  options: { tool: ToolManifest; path: string }[];
  onChoose(path: string): void;
}

/** Several tools take the dropped files: the user picks one. */
export function ToolChooser({
  open,
  onOpenChange,
  anchor,
  options,
  onChoose,
}: ToolChooserProps) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      anchor={anchor}
      side="bottom"
      align="center"
      label="Choose a tool for these files"
      className="w-72 p-2"
    >
      <p className="px-2 pt-1 pb-2 text-sm font-medium text-fg">
        Choose a tool for these files
      </p>
      <div className="flex flex-col gap-1">
        {options.map(({ tool, path }) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant="ghost"
              className="justify-start"
              leftIcon={<Icon size="sm" />}
              onClick={() => onChoose(path)}
            >
              {tool.name}
            </Button>
          );
        })}
      </div>
    </Popover>
  );
}
