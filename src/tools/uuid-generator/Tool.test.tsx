/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import UuidGenerator from './Tool';

beforeEach(() => localStorage.clear());

const renderTool = () =>
  render(
    <MemoryRouter>
      <UuidGenerator />
    </MemoryRouter>,
  );

const chooseVersion = (name: RegExp) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Version' }));
  fireEvent.click(screen.getByRole('option', { name }));
};

describe('UuidGenerator', () => {
  it('Generate makes new random ids', () => {
    renderTool();
    const list = () =>
      screen.getByRole('figure', { name: /IDs?$/ }).textContent;
    const first = list();
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(list()).not.toBe(first);
  });

  it('hides Generate where it would do nothing', () => {
    renderTool();
    chooseVersion(/Version 5/);
    expect(screen.queryByRole('button', { name: 'Generate' })).toBeNull();
    chooseVersion(/^Nil$/);
    expect(screen.queryByRole('button', { name: 'Generate' })).toBeNull();
    chooseVersion(/Version 4/);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeTruthy();
  });
});
