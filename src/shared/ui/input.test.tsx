/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateInput } from './date-input';
import { Input } from './input';

describe('Input sizes', () => {
  it('is 36px tall by default and 24px when compact', () => {
    render(
      <>
        <Input aria-label="Normal" value="" onChange={() => {}} />
        <Input aria-label="Compact" value="" onChange={() => {}} size="sm" />
      </>,
    );
    const frame = (name: string) =>
      screen.getByRole('textbox', { name }).parentElement!;
    expect(frame('Normal').className).toContain('h-9');
    expect(frame('Compact').className).toContain('h-6');
    expect(frame('Compact').className).not.toContain('h-9');
  });

  it('passes the compact size through DateInput', () => {
    const { container } = render(
      <DateInput label="Date" value="" onChange={() => {}} size="sm" />,
    );
    expect(
      container.querySelector('input')!.parentElement!.className,
    ).toContain('h-6');
  });
});
