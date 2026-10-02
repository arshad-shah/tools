import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { useEscapeLayer } from './escape-stack';
import { MENU_ITEMS, assignRef } from './menu-dom';
import { useFloating } from './use-floating';

interface MenuCtx {
  open: boolean;
  setOpen: (v: boolean, viaKeyboard?: boolean) => void;
  /** The wrapper: the anchor the menu is placed against. */
  root: React.RefObject<HTMLDivElement | null>;
  menuId: string;
  setTrigger: (el: HTMLElement | null) => void;
  setContent: (el: HTMLDivElement | null) => void;
  content: () => HTMLDivElement | null;
  /** True once after a keyboard open: the first item should take focus. */
  takeKeyboardOpen: () => boolean;
}
const Ctx = React.createContext<MenuCtx | null>(null);

/** Dropdown menu: <DropdownMenu><DropdownMenuTrigger/><DropdownMenuContent>…</> */
export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const [open, setOpenState] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const trigger = React.useRef<HTMLElement | null>(null);
  const keyboard = React.useRef(false);
  const menuId = React.useId();
  const ctx = React.useMemo<MenuCtx>(
    () => ({
      open,
      root,
      menuId,
      setOpen: (v, viaKeyboard = false) => {
        keyboard.current = v && viaKeyboard;
        setOpenState(v);
      },
      setTrigger: (el) => {
        trigger.current = el;
      },
      setContent: (el) => {
        contentRef.current = el;
      },
      content: () => contentRef.current,
      takeKeyboardOpen: () => {
        const was = keyboard.current;
        keyboard.current = false;
        return was;
      },
    }),
    [open, menuId],
  );
  // Esc closes the menu, not a dialog it sits in, and focus goes back to
  // the trigger when it was inside the menu.
  useEscapeLayer(open, () => {
    const inside = contentRef.current?.contains(document.activeElement);
    setOpenState(false);
    if (inside) trigger.current?.focus();
  });
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (root.current?.contains(t) || contentRef.current?.contains(t)) return;
      setOpenState(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <Ctx.Provider value={ctx}>
      <div ref={root} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </Ctx.Provider>
  );
};

/**
 * Wraps the trigger element: adds the menu ARIA and toggling. Extra props
 * (for example a Tooltip's aria-describedby) reach the child.
 */
export const DropdownMenuTrigger: React.FC<
  { children: React.ReactElement } & Record<string, unknown>
> = ({ children, ...rest }) => {
  const ctx = React.useContext(Ctx)!;
  const child = children as React.ReactElement<Record<string, unknown>>;
  const childRef = (child.props as { ref?: React.Ref<HTMLElement> }).ref;
  return React.cloneElement(child, {
    ...rest,
    'aria-describedby':
      cn(
        rest['aria-describedby'] as string | undefined,
        child.props['aria-describedby'] as string | undefined,
      ) || undefined,
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.menuId : undefined,
    ref: (el: HTMLElement | null) => {
      ctx.setTrigger(el);
      assignRef(childRef, el);
    },
    onClick: (e: React.MouseEvent) => {
      (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
      // detail 0: Enter, Space or a programmatic click, not a pointer.
      ctx.setOpen(!ctx.open, e.detail === 0);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      (
        child.props.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined
      )?.(e);
      if (e.defaultPrevented || e.key !== 'ArrowDown') return;
      // ArrowDown opens the menu on its first item (WAI-ARIA menu button).
      e.preventDefault();
      if (ctx.open)
        ctx.content()?.querySelector<HTMLElement>(MENU_ITEMS)?.focus();
      else ctx.setOpen(true, true);
    },
  });
};

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
}

/**
 * The menu surface, portalled and fixed so scrolling toolbars never clip
 * it; flips above the trigger when there is no room below and scrolls when
 * taller than the room left. Arrow keys, Home and End move between items.
 */
export const DropdownMenuContent: React.FC<ContentProps> = ({
  className,
  align = 'end',
  children,
  onKeyDown,
  ...props
}) => {
  const ctx = React.useContext(Ctx)!;
  const { ref, style, layout } = useFloating({
    open: ctx.open,
    anchor: ctx.root,
    side: 'bottom',
    align,
    offset: 4,
  });
  const placed = layout !== null;
  const { open, takeKeyboardOpen, content } = ctx;
  React.useEffect(() => {
    if (!open || !placed || !takeKeyboardOpen()) return;
    content()?.querySelector<HTMLElement>(MENU_ITEMS)?.focus();
  }, [open, placed, takeKeyboardOpen, content]);
  const setRef = (el: HTMLDivElement | null) => {
    assignRef(ref, el);
    ctx.setContent(el);
  };
  if (!ctx.open || typeof document === 'undefined') return null;
  const onKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const items = [
      ...(ctx.content()?.querySelectorAll<HTMLElement>(MENU_ITEMS) ?? []),
    ];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to =
      e.key === 'ArrowDown'
        ? (at + 1) % items.length
        : e.key === 'ArrowUp'
          ? (at - 1 + items.length) % items.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : null;
    if (to === null) {
      if (e.key === 'Tab') ctx.setOpen(false);
      return;
    }
    e.preventDefault();
    items[to].focus();
  };
  return createPortal(
    <div
      ref={setRef}
      id={ctx.menuId}
      role="menu"
      onKeyDown={onKeys}
      className={cn(
        'fixed z-popover min-w-40 overflow-y-auto rounded-lg bg-surface py-1 shadow-e2',
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
      tabIndex={-1}
      onClick={(e) => {
        onClick?.(e);
        ctx.setOpen(false);
      }}
      className={cn(
        'flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none transition-colors duration-fast hover:bg-surface-2 focus-visible:bg-surface-2 pointer-coarse:min-h-11',
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
