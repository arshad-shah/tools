import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { useEscapeLayer } from './escape-stack';
import { useAnchoredFloating } from './position';

interface MenuCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** The wrapper the content is anchored to. */
  root: HTMLDivElement | null;
  /** The portaled content, for outside-click checks. */
  contentRef: React.RefObject<HTMLDivElement | null>;
  /** Id of the content, named by the trigger's aria-controls. */
  id: string;
  /** Opened from the keyboard: focus moves to the first item. */
  fromKeyboardRef: React.RefObject<boolean>;
}
const Ctx = React.createContext<MenuCtx | null>(null);

const TRIGGER = '[data-menu-trigger]';
const ITEM = '[role="menuitem"]:not(:disabled)';

/** Dropdown menu: <DropdownMenu><DropdownMenuTrigger/><DropdownMenuContent>…</> */
export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const [open, setOpen] = React.useState(false);
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const fromKeyboardRef = React.useRef(false);
  const id = React.useId();
  // Esc closes the menu, not a dialog it sits in, and focus goes back to
  // the trigger when it was inside the menu.
  useEscapeLayer(open, () => {
    const inside = contentRef.current?.contains(document.activeElement);
    setOpen(false);
    if (inside) root?.querySelector<HTMLElement>(TRIGGER)?.focus();
  });
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (root?.contains(t) || contentRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, root]);
  return (
    <Ctx.Provider
      value={{ open, setOpen, root, contentRef, fromKeyboardRef, id }}
    >
      <div ref={setRoot} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </Ctx.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{
  children: React.ReactElement;
}> = ({ children }) => {
  const ctx = React.useContext(Ctx)!;
  const child = children as React.ReactElement<Record<string, unknown>>;
  return React.cloneElement(child, {
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.id : undefined,
    'data-menu-trigger': '',
    onClick: (e: React.MouseEvent) => {
      (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
      // detail 0: a keyboard (or programmatic) click.
      const { fromKeyboardRef, open, setOpen } = ctx;
      fromKeyboardRef.current = !open && e.detail === 0;
      setOpen(!open);
    },
  });
};

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
}

/**
 * The menu surface, portaled and placed by the kit positioner below the
 * trigger (above it when there is no room). Arrow keys, Home and End move
 * between items; Tab closes it and continues from the trigger.
 */
export const DropdownMenuContent: React.FC<ContentProps> = ({
  className,
  align = 'end',
  children,
  onKeyDown,
  ...props
}) => {
  const ctx = React.useContext(Ctx)!;
  const { open, setOpen, root, contentRef, fromKeyboardRef, id } = ctx;
  const {
    setFloating,
    side: placedSide,
    style,
    placed,
  } = useAnchoredFloating({
    open,
    anchor: root,
    side: 'bottom',
    align,
    offset: 4,
  });
  const setSurface = React.useCallback(
    (el: HTMLDivElement | null) => {
      contentRef.current = el;
      setFloating(el);
    },
    [contentRef, setFloating],
  );

  React.useEffect(() => {
    if (!open || !placed || !fromKeyboardRef.current) return;
    fromKeyboardRef.current = false;
    contentRef.current?.querySelector<HTMLElement>(ITEM)?.focus();
  }, [open, placed, contentRef, fromKeyboardRef]);

  if (!open || typeof document === 'undefined') return null;

  const keyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>(ITEM)];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i < 0 ? -1 : i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(-1);
    else if (e.key === 'Tab') {
      // The content lives at the end of body: hand focus back to the
      // trigger, and the Tab carries on from there.
      root?.querySelector<HTMLElement>(TRIGGER)?.focus();
      setOpen(false);
    }
  };

  return createPortal(
    <div
      ref={setSurface}
      id={id}
      role="menu"
      data-side={placedSide}
      onKeyDown={keyDown}
      className={cn(
        'z-floating min-w-40 overflow-auto rounded-lg bg-surface py-1 shadow-e2',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
};

interface ItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}
export const DropdownMenuItem: React.FC<ItemProps> = ({
  className,
  destructive,
  onClick,
  ...props
}) => {
  const ctx = React.useContext(Ctx)!;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        ctx.setOpen(false);
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-surface-2 focus-visible:bg-surface-2',
        destructive ? 'text-danger' : 'text-fg',
        className,
      )}
      {...props}
    />
  );
};

export const DropdownMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-line" role="separator" />
);
