import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Locks scroll, closes on Esc, restores focus. Shared by Dialog + Drawer. */
function useOverlay(open: boolean, onClose: () => void) {
  const prevFocus = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}
const DialogCtx = React.createContext<{ close: () => void }>({
  close: () => {},
});

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  useOverlay(open, close);
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) contentRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return createPortal(
    <DialogCtx.Provider value={{ close }}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative z-10 w-full max-w-lg rounded-lg border border-line-strong bg-surface shadow-2xl outline-none"
        >
          {children}
        </div>
      </div>
    </DialogCtx.Provider>,
    document.body,
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { close } = React.useContext(DialogCtx);
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-line p-4',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export const DialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className, ...props }) => (
  <h2
    className={cn('font-mono text-lg font-bold text-fg', className)}
    {...props}
  />
);

export const DialogDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn('mt-1 text-sm text-fg-muted', className)} {...props} />
);

export const DialogBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('p-4', className)} {...props} />;

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-wrap justify-end gap-2 border-t border-line p-4',
      className,
    )}
    {...props}
  />
);
