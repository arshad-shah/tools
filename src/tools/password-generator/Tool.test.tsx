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

const revealed = () => {
  fireEvent.click(screen.getAllByRole('button', { name: /^Reveal / })[0]);
  return screen.getByText((_, el) => el?.tagName === 'CODE').textContent ?? '';
};

describe('PasswordGenerator', () => {
  it('generates a masked password that regenerates on option change', () => {
    renderTool();
    const first = revealed();
    expect(first).toHaveLength(20);
    fireEvent.click(screen.getByRole('switch', { name: 'Symbols' }));
    const second = screen.getByText(
      (_, el) => el?.tagName === 'CODE',
    ).textContent!;
    expect(second).toMatch(/^[A-Za-z0-9]{20}$/);
    fireEvent.click(screen.getByRole('switch', { name: 'Symbols' }));
  });

  it('PIN mode makes digits only', () => {
    renderTool();
    fireEvent.click(screen.getByRole('tab', { name: 'PIN' }));
    expect(revealed()).toMatch(/^[0-9]{6}$/);
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }));
  });

  it('names an impossible setting', () => {
    renderTool();
    for (const name of ['Lowercase', 'Uppercase', 'Digits', 'Symbols'])
      fireEvent.click(screen.getByRole('switch', { name }));
    expect(
      within(document.body).getByText('Turn on at least one character set'),
    ).toBeTruthy();
    for (const name of ['Lowercase', 'Uppercase', 'Digits', 'Symbols'])
      fireEvent.click(screen.getByRole('switch', { name }));
  });
});
