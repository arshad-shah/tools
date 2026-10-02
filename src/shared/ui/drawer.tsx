import React from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
import { useEscapeLayer } from './escape-stack';

export type DrawerSide = 'left' | 'right' | 'bottom';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edge it slides in from. 'bottom' is the phone sheet. Default 'right'. */
  side?: DrawerSide;
  title?: React.ReactNode;
  /** Accessible name when there is no title. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

const PANEL: Record<DrawerSide, string> = {
  right: 'right-0 top-0 h-full w-full max-w-md border-l',
  left: 'left-0 top-0 h-full w-full max-w-md border-l-0 border-r',
  bottom: 'bottom-0 left-0 max-h-[85vh] w-full rounded-t-xl border-t',
};
const HIDDEN: Record<DrawerSide, string> = {
  right: 'motion-safe:translate-x-full',
  left: 'motion-safe:-translate-x-full',
  bottom: 'motion-safe:translate-y-full',
};

/**
 * Slide-over panel (Focus layout and phones): pages, tools or a bottom
 * sheet. Closes on Esc and backdrop click; focus moves in and returns.
 * The slide runs only without reduced motion.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  side = 'right',
  title,
  label = 'Panel',
  className,
  children,
}) => {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const titleId = React.useId();
  const panel = React.useRef<HTMLDivElement>(null);
  const [entered, setEntered] = React.useState(false);
  // Focus moves into the panel on open and returns on close.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus?.();
  }, [open]);
  // Esc closes it while it is the topmost overlay.
  useEscapeLayer(open, close);
  React.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      setEntered(false);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-dialog">
      <div
        className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        data-side={side}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col border-line bg-surface shadow-e3 outline-none',
          'motion-safe:transition-transform motion-safe:duration-slow motion-safe:ease-out-soft',
          PANEL[side],
          !entered && HIDDEN[side],
          className,
        )}
      >
        {side === 'bottom' ? (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong"
          />
        ) : null}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div
            id={titleId}
            className="min-w-0 flex-1 text-md font-semibold text-fg"
          >
            {title}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-2 hover:text-fg"
          >
            <IconX size="md" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
Drawer.displayName = 'Drawer';
