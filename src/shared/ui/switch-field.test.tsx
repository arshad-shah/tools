/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SwitchField } from './switch-field';

describe('SwitchField', () => {
  it('labels the switch and toggles it from the label', () => {
    const onChange = vi.fn();
    render(
      <SwitchField
        label="Padding"
        checked={false}
        onCheckedChange={onChange}
      />,
    );
    const sw = screen.getByRole('switch', { name: 'Padding' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByText('Padding'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('describes the switch with its hint', () => {
    render(
      <SwitchField
        label="Wrap"
        description="At 76 characters"
        checked
        onCheckedChange={() => {}}
      />,
    );
    const sw = screen.getByRole('switch', { name: 'Wrap' });
    const hint = document.getElementById(sw.getAttribute('aria-describedby')!);
    expect(hint?.textContent).toBe('At 76 characters');
  });
});
