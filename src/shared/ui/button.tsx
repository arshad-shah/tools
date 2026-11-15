import React from 'react';
import {
  Button as CyButton,
  type ButtonProps as CyButtonProps,
} from '@arshad-shah/cynosure';
import { cn } from '@/shared/lib/cn';
import type { IconComponent, IconSize } from './icons';

/*
 * Facade over Cynosure's Button (tools#104). The kit names stay; the look is
 * Cynosure's. Kit icons are React components, while Cynosure's `icon` slot
 * takes Facet icon data, so icons ride in the label until the icon swap.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Look = Required<Pick<CyButtonProps, 'variant' | 'tone'>>;
/** Kit variant to Cynosure fill and tone. */
const LOOK: Record<ButtonVariant, Look> = {
  primary: { variant: 'solid', tone: 'accent' },
  secondary: { variant: 'outline', tone: 'neutral' },
  ghost: { variant: 'ghost', tone: 'neutral' },
  danger: { variant: 'soft', tone: 'danger' },
};

type NativeButton = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'type'
> & { type?: 'button' | 'submit' | 'reset' };

/** Icon and text side by side inside Cynosure's label. */
function WithIcons({
  left,
  right,
  children,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!left && !right) return <>{children}</>;
  return (
    <span className="inline-flex min-w-0 items-center gap-(--cy-button-gap,var(--cy-space-3))">
      {left}
      {children}
      {right}
    </span>
  );
}

type Aria = React.AriaAttributes['aria-disabled'];

/**
 * Cynosure's Button writes `aria-disabled` and `aria-busy` from `loading`
 * only, dropping a caller's (a focusable "disabled with a reason" item).
 * Until it merges them, put the caller's values back on the element.
 */
function useCallerAria(
  forwarded: React.ForwardedRef<HTMLButtonElement>,
  ariaDisabled: Aria,
  ariaBusy: Aria,
  loading: boolean | undefined,
) {
  const own = React.useRef<HTMLButtonElement | null>(null);
  React.useLayoutEffect(() => {
    const el = own.current;
    if (!el || loading) return;
    for (const [name, value] of [
      ['aria-disabled', ariaDisabled],
      ['aria-busy', ariaBusy],
    ] as const) {
      if (value === undefined) el.removeAttribute(name);
      else el.setAttribute(name, String(value));
    }
  }, [ariaDisabled, ariaBusy, loading]);
  React.useImperativeHandle(forwarded, () => own.current as HTMLButtonElement);
  return own;
}

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */
export interface ButtonProps extends NativeButton {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Shows Cynosure's busy dots, sets aria-busy and disables the button. */
  loading?: boolean;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      leftIcon,
      rightIcon,
      loading,
      fullWidth,
      disabled,
      children,
      'aria-disabled': ariaDisabled,
      'aria-busy': ariaBusy,
      ...props
    },
    ref,
  ) => {
    const buttonRef = useCallerAria(ref, ariaDisabled, ariaBusy, loading);
    return (
      <CyButton
        ref={buttonRef}
        {...props}
        {...LOOK[variant ?? 'secondary']}
        size={size ?? 'md'}
        fullWidth={fullWidth ?? false}
        loading={loading ?? false}
        disabled={disabled || loading}
      >
        <WithIcons left={leftIcon} right={rightIcon}>
          {children}
        </WithIcons>
      </CyButton>
    );
  },
);
Button.displayName = 'Button';

/* ------------------------------------------------------------------ *
 * IconButton — square, icon-only, requires a label
 * ------------------------------------------------------------------ */
const iconSizeFor: Record<ButtonSize, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};
/** Tints the icon of a ghost or outline icon button (a destructive action). */
export type IconButtonTone = 'danger' | 'warning' | 'accent';

export interface IconButtonProps extends Omit<NativeButton, 'aria-label'> {
  label: string;
  /** An icon component (sized to the button) or a rendered node. */
  icon: IconComponent | React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Colour tint (e.g. a destructive action). */
  tone?: IconButtonTone;
  loading?: boolean;
  /**
   * desktop: the label shows as text beside the icon with a fine pointer on
   * wide screens (6-H); icon only, with its accessible name, elsewhere.
   */
  showLabel?: 'desktop';
  /** The visible text when showLabel applies (default `label`). */
  text?: string;
}
function renderIcon(icon: IconComponent | React.ReactNode, size: IconSize) {
  if (typeof icon === 'function') {
    const Icon = icon as IconComponent;
    return <Icon size={size} />;
  }
  return icon;
}

/**
 * Icon-only until the desktop breakpoint, then icon and text: no padding and
 * at least as wide as it is tall below it, Cynosure's padding from it.
 */
const DESK_LABEL: Record<ButtonSize, string> = {
  sm: 'min-w-(--cy-control-height-sm) [--cy-button-padding-inline:0] desk:[--cy-button-padding-inline:var(--cy-space-5)]',
  md: 'min-w-(--cy-control-height-md) [--cy-button-padding-inline:0] desk:[--cy-button-padding-inline:var(--cy-space-5)]',
  lg: 'min-w-(--cy-control-height-lg) [--cy-button-padding-inline:0] desk:[--cy-button-padding-inline:var(--cy-space-5)]',
};

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
      disabled,
      showLabel,
      text,
      'aria-disabled': ariaDisabled,
      'aria-busy': ariaBusy,
      ...props
    },
    ref,
  ) => {
    const look = LOOK[variant];
    const buttonRef = useCallerAria(ref, ariaDisabled, ariaBusy, loading);
    return (
      <CyButton
        ref={buttonRef}
        {...props}
        variant={look.variant}
        tone={tone ?? look.tone}
        size={size}
        square={!showLabel}
        aria-label={label}
        loading={loading ?? false}
        disabled={disabled || loading}
        className={cn(showLabel && DESK_LABEL[size], className)}
      >
        <WithIcons
          left={renderIcon(icon, iconSizeFor[size])}
          right={
            showLabel ? (
              <span aria-hidden className="hidden desk:inline">
                {text ?? label}
              </span>
            ) : null
          }
        />
      </CyButton>
    );
  },
);
IconButton.displayName = 'IconButton';
