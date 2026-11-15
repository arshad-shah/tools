import React from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog as CyDialog,
  IconButton,
  Sheet,
  VisuallyHidden,
} from '@arshad-shah/cynosure';
import { close as closeIcon } from '@arshad-shah/cynosure/icons';
import { cn } from '@/shared/lib/cn';
import { Popover, type PopoverProps } from './popover';

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

/**
 * The parts find their place through this context. In a Cynosure Dialog
 * or Sheet the title, description and footer are drawn into its own
 * header, description and actions (`slots`); in the popover presentation
 * the parts draw themselves.
 */
interface DialogCtxValue {
  close: () => void;
  /** null: the popover presentation. */
  slots: {
    title: HTMLElement | null;
    description: HTMLElement | null;
    actions: HTMLElement | null;
  } | null;
  setHasTitle: (v: boolean) => void;
  setHasDesc: (v: boolean) => void;
  setHasFooter: (v: boolean) => void;
}
const DialogCtx = React.createContext<DialogCtxValue>({
  close: () => {},
  slots: null,
  setHasTitle: () => {},
  setHasDesc: () => {},
  setHasFooter: () => {},
});

/** A part's place in the dialog, counted so it is there while any part is. */
function usePart(set: (v: boolean) => void) {
  React.useLayoutEffect(() => {
    set(true);
    return () => set(false);
  }, [set]);
}

/**
 * Cynosure's Dialog (or Sheet): a modal in the top layer. Focus moves in,
 * stays in and comes back; Escape (when it is the topmost overlay), the
 * backdrop and the close button close it. Below about 36rem it becomes a
 * bottom sheet. The kit parts (DialogHeader, DialogTitle,
 * DialogDescription, DialogBody, DialogFooter) keep their composition.
 */
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
  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDesc, setHasDesc] = React.useState(false);
  const [hasFooter, setHasFooter] = React.useState(false);
  const [title, setTitle] = React.useState<HTMLElement | null>(null);
  const [description, setDescription] = React.useState<HTMLElement | null>(
    null,
  );
  const [actions, setActions] = React.useState<HTMLElement | null>(null);
  const as = presentation === 'popover' && !anchor ? 'dialog' : presentation;
  const popover = as === 'popover';
  const ctx = React.useMemo<DialogCtxValue>(
    () => ({
      close,
      slots: popover ? null : { title, description, actions },
      setHasTitle,
      setHasDesc,
      setHasFooter,
    }),
    [close, popover, title, description, actions],
  );

  if (popover && anchor)
    return (
      <DialogCtx.Provider value={ctx}>
        <Popover
          open={open}
          onOpenChange={onOpenChange}
          anchor={anchor}
          label={label ?? 'Dialog'}
          modal
          className="flex w-80 max-w-full flex-col gap-3 p-4"
        >
          {children}
        </Popover>
      </DialogCtx.Provider>
    );

  const frame = {
    open,
    onOpenChange,
    title: (
      <span ref={setTitle} className="contents">
        {hasTitle ? null : <VisuallyHidden>{label ?? 'Dialog'}</VisuallyHidden>}
      </span>
    ),
    description: hasDesc ? <span ref={setDescription} /> : undefined,
    actions: hasFooter ? (
      <span ref={setActions} className="contents" />
    ) : undefined,
    children: open ? (
      <DialogCtx.Provider value={ctx}>{children}</DialogCtx.Provider>
    ) : null,
  };
  const dialog =
    as === 'sheet' ? (
      <Sheet {...frame} side="bottom" />
    ) : (
      <CyDialog {...frame} size={size} />
    );
  // Portaled to body as before: no ancestor (a hidden panel, a form) holds it.
  return typeof document === 'undefined'
    ? null
    : createPortal(dialog, document.body);
};

/** A part drawn into a slot of the Cynosure dialog, or in place. */
function InSlot({
  slot,
  children,
}: {
  slot: HTMLElement | null;
  children: React.ReactNode;
}) {
  return slot ? createPortal(children, slot) : null;
}

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { close, slots } = React.useContext(DialogCtx);
  // In a Cynosure dialog its own header holds the title and close button.
  if (slots) return <>{children}</>;
  return (
    <div
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <IconButton
        icon={closeIcon}
        label="Close"
        variant="ghost"
        size="sm"
        onClick={close}
      />
    </div>
  );
};

export const DialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ children, ...props }) => {
  const { slots, setHasTitle } = React.useContext(DialogCtx);
  usePart(setHasTitle);
  if (slots) return <InSlot slot={slots.title}>{children}</InSlot>;
  return (
    <h2 className="text-md font-semibold text-fg" {...props}>
      {children}
    </h2>
  );
};

export const DialogDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, children, ...props }) => {
  const { slots, setHasDesc } = React.useContext(DialogCtx);
  usePart(setHasDesc);
  if (slots) return <InSlot slot={slots.description}>{children}</InSlot>;
  return (
    <p className={cn('mt-1 text-sm text-fg-muted', className)} {...props}>
      {children}
    </p>
  );
};

/** The dialog's content; Cynosure pads it and scrolls it when it is tall. */
export const DialogBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={className} {...props} />;

/** The buttons along the bottom (Cancel first, then the main action). */
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { slots, setHasFooter } = React.useContext(DialogCtx);
  usePart(setHasFooter);
  if (slots) return <InSlot slot={slots.actions}>{children}</InSlot>;
  return (
    <div
      className={cn('flex flex-wrap justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
};
