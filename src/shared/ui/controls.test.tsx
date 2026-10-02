/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox, NumberInput, Progress, Slider, Switch } from './controls';
import { StatusDot } from './status-dot';
import { Swatch } from './swatch';
import { Tabs, TabsList, TabsTrigger } from './tabs';

// WCAG 1.4.11: boundaries use line-control, state indicators accent-indicator
// (both pinned >= 3:1 by test/tokens.contrast.test.ts).
describe('non-text contrast roles', () => {
  it('unchecked checkbox and switch draw a line-control boundary', () => {
    render(
      <>
        <Checkbox checked={false} onCheckedChange={() => {}} aria-label="c" />
        <Switch checked={false} onCheckedChange={() => {}} aria-label="s" />
      </>,
    );
    expect(screen.getByRole('checkbox').className).toContain(
      'border-line-control',
    );
    expect(screen.getByRole('switch').className).toContain(
      'border-line-control',
    );
  });

  it('on and checked states use the indicator role', () => {
    render(
      <>
        <Checkbox checked onCheckedChange={() => {}} aria-label="c" />
        <Switch checked onCheckedChange={() => {}} aria-label="s" />
      </>,
    );
    expect(screen.getByRole('checkbox').className).toContain(
      'border-accent-indicator',
    );
    expect(screen.getByRole('switch').className).toContain(
      'border-accent-indicator',
    );
  });

  it('slider track, progress fill, swatch, status dot and tab underline', () => {
    const { container } = render(
      <>
        <Slider value={1} onValueChange={() => {}} aria-label="v" />
        <Progress value={50} label="p" />
        <Swatch color="info" label="w" />
        <StatusDot tone="accent" label="Saved" />
        <Tabs value="a" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
        </Tabs>
      </>,
    );
    expect(screen.getByRole('slider').className).toContain('bg-line-control');
    expect(
      container.querySelector('[role="progressbar"] > div')!.className,
    ).toContain('bg-accent-indicator');
    expect(screen.getByRole('img', { name: 'w' }).className).toContain(
      'border-line-control',
    );
    expect(screen.getByRole('img', { name: 'Saved' }).className).toContain(
      'bg-accent-indicator',
    );
    expect(screen.getByRole('tab').className).toContain(
      'border-accent-indicator',
    );
  });
});

describe('NumberInput size', () => {
  it('lg makes the field and its steppers 44px', () => {
    render(
      <NumberInput
        value={11}
        onValueChange={() => {}}
        size="lg"
        aria-label="Text size"
      />,
    );
    const dec = screen.getByRole('button', { name: 'Decrement' });
    expect(dec.className).toContain('w-touch');
    expect(dec.parentElement!.className).toContain('h-touch');
  });
});

describe('Slider value text', () => {
  it('announces a readable value and takes a visible label', () => {
    render(
      <>
        <span id="slant-label">Slant</span>
        <Slider
          value={5}
          min={-20}
          max={20}
          onValueChange={() => {}}
          aria-labelledby="slant-label"
          aria-valuetext="5 degrees"
        />
      </>,
    );
    const s = screen.getByRole('slider', { name: 'Slant' });
    expect(s.getAttribute('aria-valuetext')).toBe('5 degrees');
  });
});
