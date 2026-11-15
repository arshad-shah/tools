/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IconSearch } from './icons';
import { Button, IconButton } from './button';

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    '%s renders a Cynosure button',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      const b = screen.getByRole('button', { name: 'Go' });
      expect(b.classList.contains('cy-button')).toBe(true);
    },
  );

  it('maps the kit variants onto Cynosure fills and tones', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );
    const look = (name: string) => {
      const b = screen.getByRole('button', { name });
      return [b.dataset.variant, b.dataset.tone];
    };
    expect(look('Primary')).toEqual(['solid', 'accent']);
    expect(look('Secondary')).toEqual(['outline', 'neutral']);
    expect(look('Ghost')).toEqual(['ghost', 'neutral']);
    expect(look('Danger')).toEqual(['soft', 'danger']);
  });

  it('never submits a form unless asked to', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('shows the icons beside the label and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} leftIcon={<IconSearch />} rightIcon={<IconSearch />}>
        Find
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Find' });
    expect(b.querySelectorAll('svg')).toHaveLength(2);
    expect(ref.current).toBe(b);
  });

  it('disabled and loading disable the button', () => {
    const { rerender } = render(<Button disabled>Go</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    rerender(<Button loading>Go</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('passes clicks and native attributes through', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} aria-pressed title="Hint">
        Go
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Go' });
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(b.getAttribute('title')).toBe('Hint');
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

  it('is a square Cynosure button at each size', () => {
    render(
      <>
        <IconButton label="Small" icon={IconSearch} size="sm" />
        <IconButton label="Medium" icon={IconSearch} />
      </>,
    );
    const sm = screen.getByRole('button', { name: 'Small' });
    const md = screen.getByRole('button', { name: 'Medium' });
    expect(sm.dataset.size).toBe('sm');
    expect(md.dataset.size).toBe('md');
    expect(sm.hasAttribute('data-square')).toBe(true);
  });

  it('a rendered icon node keeps its own size', () => {
    const { container } = render(
      <IconButton label="More" icon={<IconSearch size="xs" />} size="sm" />,
    );
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('12');
  });

  it('tone tints the button', () => {
    render(
      <IconButton
        label="Delete"
        icon={IconSearch}
        variant="ghost"
        tone="danger"
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete' }).dataset.tone).toBe(
      'danger',
    );
  });
});

describe('Button busy state', () => {
  it('loading sets aria-busy', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });
});

describe('IconButton showLabel (6-H desktop labels)', () => {
  it('adds a desktop-only text label and keeps the accessible name', () => {
    render(<IconButton label="Export" icon={<span />} showLabel="desktop" />);
    const b = screen.getByRole('button', { name: 'Export' });
    const text = [...b.querySelectorAll('span[aria-hidden]')].find(
      (s) => s.textContent === 'Export',
    );
    expect(text).toBeTruthy();
    expect(b.hasAttribute('data-square')).toBe(false);
  });
});
