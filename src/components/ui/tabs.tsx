import React from 'react';
import { cn } from '@/lib/utils';

type TabsVariant = 'soft' | 'line';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  variant: TabsVariant;
  fullWidth: boolean;
}
const Ctx = React.createContext<TabsCtx | null>(null);
const useTabs = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
};

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  variant?: TabsVariant;
  fullWidth?: boolean;
}
export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  variant = 'line',
  fullWidth = false,
  className,
  children,
  ...props
}) => (
  <Ctx.Provider value={{ value, setValue: onValueChange, variant, fullWidth }}>
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      {children}
    </div>
  </Ctx.Provider>
);

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { variant, fullWidth } = useTabs();
  const ref = React.useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const idx = tabs.findIndex((t) => t === document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight'
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        'flex',
        variant === 'soft'
          ? 'gap-1 rounded-md border border-line bg-surface p-1'
          : 'gap-1 border-b border-line',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { value: active, setValue, variant, fullWidth } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        'font-mono text-sm transition-colors focus:outline-none focus-visible:text-accent',
        fullWidth && 'flex-1',
        variant === 'soft'
          ? cn(
              'rounded px-3 py-1.5',
              selected
                ? 'bg-accent font-bold text-accent-ink'
                : 'text-fg-muted hover:text-fg',
            )
          : cn(
              '-mb-px border-b-2 px-3 py-2',
              selected
                ? 'border-accent text-accent'
                : 'border-transparent text-fg-muted hover:text-fg',
            ),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}
export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={className} {...props}>
      {children}
    </div>
  );
};
