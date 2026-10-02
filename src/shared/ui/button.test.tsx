/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconSearch } from './icons';
import { Button, IconButton } from './button';
import { buttonVariants } from './button-variants';

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    '%s renders',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
    },
  );

  it('primary is the accent fill', () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole('button').className).toContain('bg-accent');
  });

  it('deprecated aliases match their replacements', () => {
    expect(buttonVariants({ variant: 'solid' })).toBe(
      buttonVariants({ variant: 'primary' }),
    );
    expect(buttonVariants({ variant: 'soft' })).toBe(
      buttonVariants({ variant: 'secondary' }),
    );
    expect(buttonVariants({ variant: 'outline' })).toBe(
      buttonVariants({ variant: 'secondary' }),
    );
    expect(buttonVariants({ size: 'xs' })).toBe(buttonVariants({ size: 'sm' }));
  });

  it('disabled and loading disable the button', () => {
    const { rerender } = render(<Button disabled>Go</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    rerender(<Button loading>Go</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});

describe('IconButton', () => {
  it('takes an icon component, sized to the button, and a label', () => {
    const { container } = render(
      <IconButton label="Search" icon={IconSearch} size="lg" />,
    );
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy();
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('20');
  });

  it('lg is a 44px touch target', () => {
    render(<IconButton label="Search" icon={IconSearch} size="lg" />);
    expect(screen.getByRole('button').className).toContain('size-11');
  });
});

describe('Button busy state', () => {
  it('loading sets aria-busy', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });
});
