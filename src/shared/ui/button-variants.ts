import { cva } from 'class-variance-authority';

/** Button look (variant, size, width); shared by Button and IconButton. */
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
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'soft', size: 'md', fullWidth: false },
  },
);
