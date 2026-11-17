/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PasswordGenerator from './Tool';

beforeEach(() => localStorage.clear());

const renderTool = () =>
  render(
    <MemoryRouter>
      <PasswordGenerator />
    </MemoryRouter>,
  );

/** The generated value (a masked, read-only field). */
const generated = (label = 'password') =>
  (screen.getByLabelText(`Generated ${label}`) as HTMLInputElement).value;
/** Starts in Password mode (the mode is a remembered setting). */
const renderInPasswordMode = () => {
  renderTool();
  fireEvent.click(screen.getByRole('radio', { name: 'Password' }));
};

describe('PasswordGenerator', () => {
  it('generates a masked password that regenerates on option change', () => {
    renderInPasswordMode();
    const field = screen.getByLabelText('Generated password');
    expect(field.getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show the password' }));
    expect(field.getAttribute('type')).toBe('text');
    expect(generated()).toHaveLength(20);
    fireEvent.click(screen.getByRole('switch', { name: 'Symbols' }));
    expect(generated()).toMatch(/^[A-Za-z0-9]{20}$/);
    fireEvent.click(screen.getByRole('switch', { name: 'Symbols' }));
  });

  it('PIN mode makes digits only', () => {
    renderInPasswordMode();
    fireEvent.click(screen.getByRole('radio', { name: 'PIN' }));
    expect(generated('PIN')).toMatch(/^[0-9]{6}$/);
    fireEvent.click(screen.getByRole('radio', { name: 'Password' }));
  });

  it('Regenerate makes a new one', () => {
    renderInPasswordMode();
    const first = generated();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(generated()).not.toBe(first);
  });

  it('names an impossible setting', () => {
    renderInPasswordMode();
    for (const name of ['Lowercase', 'Uppercase', 'Digits', 'Symbols'])
      fireEvent.click(screen.getByRole('switch', { name }));
    expect(
      within(document.body).getByText('Turn on at least one character set'),
    ).toBeTruthy();
    for (const name of ['Lowercase', 'Uppercase', 'Digits', 'Symbols'])
      fireEvent.click(screen.getByRole('switch', { name }));
  });
});
