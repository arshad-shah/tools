import { cva } from 'class-variance-authority';

const primary =
  'bg-accent text-accent-ink hover:brightness-95 active:brightness-90';
const secondary =
  'border border-line-strong bg-surface text-fg hover:bg-surface-2 active:bg-surface-3';

/** Button look (variant, size, width); shared by Button and IconButton. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background-color,border-color,color,filter] duration-fast ease-out-soft disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  {
    variants: {
      variant: {
        primary,
        secondary,
        ghost:
          'text-fg-muted hover:bg-surface-2 hover:text-fg active:bg-surface-3',
        danger:
          'border border-danger/40 bg-danger-soft text-danger hover:border-danger/70',
      },
      // Touch (coarse pointer): every size reaches the 44px target.
      size: {
        sm: 'h-8 px-3 text-sm pointer-coarse:min-h-touch pointer-coarse:min-w-touch',
        md: 'h-9 px-4 text-base pointer-coarse:min-h-touch pointer-coarse:min-w-touch',
        lg: 'h-touch px-5 text-md',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', fullWidth: false },
  },
);
