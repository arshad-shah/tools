import React from 'react';
import { cn } from '@/lib/utils';

interface MenuCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const Ctx = React.createContext<MenuCtx | null>(null);

/** Dropdown menu: <DropdownMenu><DropdownMenuTrigger/><DropdownMenuContent>…</> */
export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <Ctx.Provider value={{ open, setOpen }}>
      <div ref={ref} className={cn('relative inline-flex', className)}>
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
    onClick: (e: React.MouseEvent) => {
      (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
      ctx.setOpen(!ctx.open);
    },
  });
};

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
}
export const DropdownMenuContent: React.FC<ContentProps> = ({
  className,
  align = 'end',
  children,
  ...props
}) => {
  const ctx = React.useContext(Ctx)!;
  if (!ctx.open) return null;
  return (
    <div
      role="menu"
      className={cn(
        'absolute top-full z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-line-strong bg-surface py-1 shadow-xl',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
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
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-subtle',
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
