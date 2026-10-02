import React from 'react';
import { IconChevronDown } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

interface AccordionCtx {
  open: Set<string>;
  toggle: (value: string) => void;
}
const Ctx = React.createContext<AccordionCtx | null>(null);
const ItemCtx = React.createContext<string>('');

interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}
export const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  defaultValue,
  className,
  children,
}) => {
  const [open, setOpen] = React.useState<Set<string>>(
    () =>
      new Set(
        defaultValue
          ? Array.isArray(defaultValue)
            ? defaultValue
            : [defaultValue]
          : [],
      ),
  );
  const toggle = (value: string) =>
    setOpen((prev) => {
      const next = new Set(type === 'single' ? [] : prev);
      if (prev.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  return (
    <Ctx.Provider value={{ open, toggle }}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </Ctx.Provider>
  );
};

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}
export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  className,
  children,
}) => (
  <ItemCtx.Provider value={value}>
    <div
      className={cn(
        'overflow-hidden rounded-lg bg-surface shadow-e1',
        className,
      )}
    >
      {children}
    </div>
  </ItemCtx.Provider>
);

export const AccordionTrigger: React.FC<
  React.HTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => {
  const ctx = React.useContext(Ctx)!;
  const value = React.useContext(ItemCtx);
  const isOpen = ctx.open.has(value);
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => ctx.toggle(value)}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left text-sm font-semibold text-fg transition-colors duration-fast hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronDown
        size="sm"
        className={cn(
          'shrink-0 text-fg-subtle transition-transform duration-base',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
};

export const AccordionContent: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, children, ...props }) => {
  const ctx = React.useContext(Ctx)!;
  const value = React.useContext(ItemCtx);
  if (!ctx.open.has(value)) return null;
  return (
    <div
      role="region"
      className={cn(
        'border-t border-line px-4 py-3 text-sm text-fg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
