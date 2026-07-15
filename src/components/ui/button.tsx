import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Slot — minimal asChild support (merges props onto a single child)
 * ------------------------------------------------------------------ */
interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, className, ...props }, ref) => {
    if (!React.isValidElement(children)) return null;
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(className, child.props.className as string | undefined),
    });
  },
);
Slot.displayName = 'Slot';

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-accent text-accent-ink hover:bg-accent-hover',
        soft: 'border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-subtle',
        ghost: 'text-fg-muted hover:bg-surface hover:text-fg',
        outline:
          'border border-line-strong text-fg hover:border-accent hover:text-accent',
        danger:
          'border border-danger/40 bg-danger-dim text-danger hover:border-danger/70',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: { variant: 'soft', size: 'md' },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (asChild) {
      return (
        <Slot className={classes} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  },
);
Button.displayName = 'Button';

/* ------------------------------------------------------------------ *
 * IconButton — square, icon-only, requires a label
 * ------------------------------------------------------------------ */
const iconButtonSize = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-11',
} as const;
export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  label: string;
  icon: React.ReactNode;
  variant?: NonNullable<VariantProps<typeof buttonVariants>['variant']>;
  size?: keyof typeof iconButtonSize;
  asChild?: boolean;
}
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      label,
      icon,
      variant = 'soft',
      size = 'md',
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      buttonVariants({ variant }),
      'p-0',
      iconButtonSize[size],
      className,
    );
    if (asChild) {
      return (
        <Slot className={classes} aria-label={label} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button ref={ref} className={classes} aria-label={label} {...props}>
        {icon}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
