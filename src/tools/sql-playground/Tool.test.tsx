/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SqlPlayground from './Tool';

describe('SQL Playground', () => {
  it('starts with an empty database, a drop zone and the SQL editor', () => {
    render(
      <MemoryRouter>
        <SqlPlayground />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Database' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No tables yet' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Query' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'SQL' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
    // An empty database offers the sample tables once, in its empty state;
    // the More menu (new database, download) waits for tables.
    expect(
      screen.getAllByRole('button', { name: 'Load sample tables' }),
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    // Nothing has run yet, so there is no results section.
    expect(screen.queryByRole('heading', { name: 'Results' })).toBeNull();
  });
});
