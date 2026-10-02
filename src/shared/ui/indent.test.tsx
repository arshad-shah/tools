/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Indent } from './indent';

describe('Indent', () => {
  it('pads by level * step + base', () => {
    render(
      <Indent level={2} step={12} base={4} data-testid="i">
        x
      </Indent>,
    );
    expect(screen.getByTestId('i').style.paddingLeft).toBe('28px');
  });
  it('defaults to 16px per level and clamps negatives', () => {
    const { rerender } = render(<Indent level={3} data-testid="i" />);
    expect(screen.getByTestId('i').style.paddingLeft).toBe('48px');
    rerender(<Indent level={-1} data-testid="i" />);
    expect(screen.getByTestId('i').style.paddingLeft).toBe('0px');
  });
});
