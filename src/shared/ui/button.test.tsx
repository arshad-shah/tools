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

  it('has no deprecated aliases left (decision G20, removed in A2-12)', () => {
    for (const alias of ['solid', 'soft', 'outline'])
      expect(
        buttonVariants({ variant: alias as 'primary' }).includes('bg-accent'),
      ).toBe(false);
    expect(buttonVariants({ size: 'xs' as 'sm' })).not.toContain('h-8');
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

  it('sm and md take their box and glyph from the size tokens', () => {
    render(
      <>
        <IconButton label="Small" icon={IconSearch} size="sm" />
        <IconButton label="Medium" icon={IconSearch} />
      </>,
    );
    const sm = screen.getByRole('button', { name: 'Small' });
    const md = screen.getByRole('button', { name: 'Medium' });
    expect(sm.className).toContain('size-(--icon-button-sm)');
    expect(md.className).toContain('size-(--icon-button-md)');
    expect(sm.querySelector('svg')?.getAttribute('class')).toContain(
      'size-(--icon-glyph-sm)',
    );
    expect(md.querySelector('svg')?.getAttribute('class')).toContain(
      'size-(--icon-glyph-md)',
    );
  });

  it('a rendered icon node keeps its own size', () => {
    const { container } = render(
      <IconButton label="More" icon={<IconSearch size="xs" />} size="sm" />,
    );
    expect(container.querySelector('svg')?.getAttribute('class')).not.toContain(
      'icon-glyph',
    );
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
