import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right';
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Slide-in side panel. Closes on Esc and backdrop click. */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  side = 'right',
  title,
  className,
  children,
}) => {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute top-0 flex h-full w-full max-w-md flex-col border-line bg-surface shadow-2xl',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0 flex-1 font-mono text-lg font-bold text-fg">
            {title}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
Drawer.displayName = 'Drawer';
