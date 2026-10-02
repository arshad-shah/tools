import React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';
import { buttonVariants } from './button-variants';
import type { IconComponent, IconSize } from './icons';
import { Spinner } from './spinner';

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
/** Spinner size that visually matches each button size. */
const spinnerForSize = { sm: 'sm', md: 'sm', lg: 'md' } as const;

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'fullWidth'> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Show a spinner in place of the left icon and disable the button. */
  loading?: boolean;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
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
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
    if (asChild) {
      return (
        <Slot className={classes} {...props}>
          {children}
        </Slot>
      );
    }
    const left = loading ? (
      <Spinner size={spinnerForSize[size ?? 'md']} decorative />
    ) : (
      leftIcon
    );
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {left}
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
  md: 'size-9',
  lg: 'size-11',
} as const;
const iconSizeFor: Record<keyof typeof iconButtonSize, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};
/** Tints ghost/soft icon buttons without a full filled background. */
const iconButtonTone = {
  danger: 'text-danger hover:text-danger',
  warning: 'text-warning hover:text-warning',
  accent: 'text-accent-fg hover:text-accent-fg',
} as const;
export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  label: string;
  /** An icon component (sized to the button) or a rendered node. */
  icon: IconComponent | React.ReactNode;
  variant?: NonNullable<VariantProps<typeof buttonVariants>['variant']>;
  size?: keyof typeof iconButtonSize;
  /** Color tint for ghost/soft icon buttons (e.g. a destructive action). */
  tone?: keyof typeof iconButtonTone;
  loading?: boolean;
  asChild?: boolean;
}
function renderIcon(icon: IconComponent | React.ReactNode, size: IconSize) {
  if (typeof icon === 'function') {
    const Icon = icon as IconComponent;
    return <Icon size={size} />;
  }
  return icon;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      label,
      icon,
      variant = 'secondary',
      size = 'md',
      tone,
      loading,
      asChild,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      buttonVariants({ variant }),
      'p-0',
      iconButtonSize[size],
      tone && iconButtonTone[tone],
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
      <button
        ref={ref}
        className={classes}
        aria-label={label}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" decorative />
        ) : (
          renderIcon(icon, iconSizeFor[size])
        )}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
