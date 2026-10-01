/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordPrompt } from './PasswordPrompt';

describe('PasswordPrompt', () => {
  it('submits the typed password, shows errors, and can be skipped', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <PasswordPrompt
        fileName="a.pdf"
        error="That password is not correct. Try again."
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    const input = screen.getByLabelText('Password for a.pdf');
    expect(input.getAttribute('type')).toBe('password');
    expect(screen.getByRole('alert').textContent).toContain('not correct');
    fireEvent.change(input, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(onSubmit).toHaveBeenCalledWith('secret');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(input.getAttribute('type')).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Skip this file' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('never submits an empty password', () => {
    const onSubmit = vi.fn();
    render(<PasswordPrompt fileName="b.pdf" onSubmit={onSubmit} />);
    const button = screen.getByRole('button', { name: 'Unlock' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Unlock b.pdf' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Skip this file' })).toBeNull();
  });
});
