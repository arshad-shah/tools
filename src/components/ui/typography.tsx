import React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Heading
 * ------------------------------------------------------------------ */
const headingSize = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
} as const;

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: keyof typeof headingSize;
  /** Use the monospace family (terminal chrome). */
  mono?: boolean;
}
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 2, size = 'xl', mono, ...props }, ref) => {
    const Tag = `h${level}` as const;
    return (
      <Tag
        ref={ref}
        className={cn(
          'font-bold tracking-tight text-fg',
          mono && 'font-mono',
          headingSize[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Heading.displayName = 'Heading';

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */
const textSize = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;
const textTone = {
  default: 'text-fg',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
  faint: 'text-fg-faint',
  accent: 'text-accent',
} as const;

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div';
  size?: keyof typeof textSize;
  tone?: keyof typeof textTone;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  mono?: boolean;
}
const weightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;
export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      className,
      as: Tag = 'p',
      size = 'md',
      tone = 'default',
      weight = 'normal',
      mono,
      ...props
    },
    ref,
  ) => (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={cn(
        textSize[size],
        textTone[tone],
        weightMap[weight],
        mono && 'font-mono',
        className,
      )}
      {...props}
    />
  ),
);
Text.displayName = 'Text';

/* ------------------------------------------------------------------ *
 * Label
 * ------------------------------------------------------------------ */
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium text-fg', className)}
    {...props}
  />
));
Label.displayName = 'Label';

/* ------------------------------------------------------------------ *
 * Code — inline / block monospace
 * ------------------------------------------------------------------ */
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  block?: boolean;
}
export const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, block, ...props }, ref) => (
    <code
      ref={ref}
      className={cn(
        'font-mono text-sm text-fg-muted',
        block
          ? 'block overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-line bg-canvas p-3'
          : 'rounded bg-surface-subtle px-1.5 py-0.5',
        className,
      )}
      {...props}
    />
  ),
);
Code.displayName = 'Code';

/* ------------------------------------------------------------------ *
 * Kbd — keyboard / identifier chip
 * ------------------------------------------------------------------ */
export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({
  className,
  ...props
}) => (
  <kbd
    className={cn(
      'inline-flex items-center rounded border border-line-strong bg-surface-subtle px-1.5 py-0.5 font-mono text-xs text-fg-muted',
      className,
    )}
    {...props}
  />
);
Kbd.displayName = 'Kbd';
