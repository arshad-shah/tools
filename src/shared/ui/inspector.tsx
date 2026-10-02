import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconChevronDown, IconX } from '@/shared/ui/icons';
import { Drawer } from './drawer';
import { Popover, type PopoverProps } from './popover';

export interface InspectorProps {
  title: string;
  /** panel: docked (Standard); popover: next to the selection (Focus); sheet: bottom sheet (phone). */
  mode: 'panel' | 'popover' | 'sheet';
  /** Required in popover mode. */
  anchor?: PopoverProps['anchor'];
  open: boolean;
  onOpenChange(o: boolean): void;
  children: React.ReactNode;
}

/** Property sections for the current selection, in the surface the layout calls for. */
export function Inspector({
  title,
  mode,
  anchor,
  open,
  onOpenChange,
  children,
}: InspectorProps) {
  if (mode === 'popover' && anchor)
    return (
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        anchor={anchor}
        side="right"
        label={title}
        className="w-72 p-0"
      >
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </Popover>
    );
  if (mode === 'sheet')
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        side="bottom"
        title={title}
      >
        {children}
      </Drawer>
    );
  if (!open) return null;
  return (
    <aside
      aria-label={title}
      className="flex h-full w-72 shrink-0 flex-col border-l border-line bg-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={() => onOpenChange(false)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-2 hover:text-fg"
        >
          <IconX size="sm" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
Inspector.displayName = 'Inspector';

export interface InspectorSectionProps {
  title: string;
  children: React.ReactNode;
  /** Default true. */
  defaultOpen?: boolean;
}

/** A labelled, collapsible section: an h3 with a toggle and a region. */
export function InspectorSection({
  title,
  children,
  defaultOpen = true,
}: InspectorSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <section className="border-b border-line last:border-b-0">
      <h3 className="m-0">
        <button
          type="button"
          id={`${id}-h`}
          aria-expanded={open}
          aria-controls={open ? `${id}-r` : undefined}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted transition-colors duration-fast hover:text-fg"
        >
          {title}
          <IconChevronDown
            size="sm"
            className={cn(
              'motion-safe:transition-transform motion-safe:duration-base',
              !open && '-rotate-90',
            )}
          />
        </button>
      </h3>
      {open ? (
        <div
          id={`${id}-r`}
          role="region"
          aria-labelledby={`${id}-h`}
          className="flex flex-col gap-3 px-3 pb-3"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
InspectorSection.displayName = 'InspectorSection';
