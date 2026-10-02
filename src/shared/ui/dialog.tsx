import React from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
import { useEscapeLayer } from './escape-stack';
import { Popover, type PopoverProps } from './popover';

/**
 * Locks scroll, closes on Esc (when it is the topmost overlay), restores
 * focus.
 */
function useOverlay(open: boolean, onClose: () => void) {
  const prevFocus = React.useRef<HTMLElement | null>(null);
  useEscapeLayer(open, onClose);
  React.useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open]);
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name when the dialog has no DialogTitle. */
  label?: string;
  /** lg: wide content (side-by-side previews); default md. */
  size?: 'md' | 'lg';
  /**
   * dialog: centred (default). popover: next to `anchor` (the tool that
   * opened it), no backdrop. sheet: a bottom sheet (phones).
   */
  presentation?: 'dialog' | 'popover' | 'sheet';
  /** Required for the popover presentation (it falls back to dialog). */
  anchor?: PopoverProps['anchor'];
  children: React.ReactNode;
}
const DialogCtx = React.createContext<{
  close: () => void;
  titleId: string;
  descId: string;
  setHasTitle: (v: boolean) => void;
  setHasDesc: (v: boolean) => void;
}>({
  close: () => {},
  titleId: '',
  descId: '',
  setHasTitle: () => {},
  setHasDesc: () => {},
});

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  label,
  size = 'md',
  presentation = 'dialog',
  anchor,
  children,
}) => {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const id = React.useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  // Title and description register themselves, so the dialog only points
  // at ids that exist.
  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDesc, setHasDesc] = React.useState(false);
  const ctx = React.useMemo(
    () => ({ close, titleId, descId, setHasTitle, setHasDesc }),
    [close, titleId, descId],
  );
  const as = presentation === 'popover' && !anchor ? 'dialog' : presentation;
  useOverlay(open && as !== 'popover', close);
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open && as !== 'popover') contentRef.current?.focus();
  }, [open, as]);
  if (!open) return null;
  if (as === 'popover' && anchor)
    return (
      <DialogCtx.Provider value={ctx}>
        <Popover
          open
          onOpenChange={onOpenChange}
          anchor={anchor}
          label={label ?? 'Dialog'}
          modal
          className="flex max-h-[calc(100dvh-1rem)] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0"
        >
          {children}
        </Popover>
      </DialogCtx.Provider>
    );
  const sheet = as === 'sheet';
  return createPortal(
    <DialogCtx.Provider value={ctx}>
      <div
        className={cn(
          'fixed inset-0 z-dialog flex',
          sheet
            ? 'items-end'
            : 'items-center justify-center p-4 max-sm:items-end max-sm:p-0',
        )}
      >
        <div
          className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={hasTitle ? titleId : undefined}
          aria-label={hasTitle ? undefined : label}
          aria-describedby={hasDesc ? descId : undefined}
          data-presentation={as}
          tabIndex={-1}
          className={cn(
            'relative z-10 flex w-full flex-col overflow-hidden bg-surface shadow-e3 outline-none',
            sheet
              ? 'bottom-0 max-h-[85dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]'
              : cn(
                  'max-h-[calc(100dvh-2rem)] rounded-xl',
                  // Phones: a bottom sheet, full width, up to the full
                  // height, with the footer actions in thumb reach.
                  'max-sm:max-h-dvh max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]',
                  size === 'lg' ? 'max-w-3xl' : 'max-w-lg',
                ),
          )}
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
        className="-m-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:text-fg pointer-coarse:size-11"
      >
        <IconX size="md" />
      </button>
    </div>
  );
};

export const DialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className, ...props }) => {
  const { titleId, setHasTitle } = React.useContext(DialogCtx);
  React.useEffect(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, [setHasTitle]);
  return (
    <h2
      id={titleId}
      className={cn('text-lg font-semibold text-fg', className)}
      {...props}
    />
  );
};

export const DialogDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => {
  const { descId, setHasDesc } = React.useContext(DialogCtx);
  React.useEffect(() => {
    setHasDesc(true);
    return () => setHasDesc(false);
  }, [setHasDesc]);
  return (
    <p
      id={descId}
      className={cn('mt-1 text-sm text-fg-muted', className)}
      {...props}
    />
  );
};

export const DialogBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn('min-h-0 overflow-y-auto p-4', className)} {...props} />
);

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
