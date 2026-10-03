import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { ToolActionsSlot } from './tool-actions-slot';

export interface ToolActionsProps {
  children: React.ReactNode;
  /** Classes for the in-place fallback row. */
  className?: string;
}

/**
 * Page-level actions for the whole tool: Share, Export, Send to, Undo/Redo.
 * They render in the tool header beside the favourite star, so every tool
 * keeps them in one predictable place instead of a row of their own.
 */
export function ToolActions({ children, className }: ToolActionsProps) {
  const slot = useContext(ToolActionsSlot);
  if (slot) return createPortal(children, slot);
  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
    >
      {children}
    </div>
  );
}
ToolActions.displayName = 'ToolActions';
