/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { List, ListItem } from './list';

describe('List', () => {
  it('is a named list with one item per ListItem', () => {
    render(
      <List aria-label="Risks found">
        <ListItem>GPS position</ListItem>
        <ListItem>Camera serial</ListItem>
      </List>,
    );
    const list = screen.getByRole('list', { name: 'Risks found' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['GPS position', 'Camera serial']);
  });

  it('keeps data attributes on a wrapper', () => {
    const { container } = render(
      <List aria-label="Next runs" data-dynamic="">
        <ListItem>Mon</ListItem>
      </List>,
    );
    const host = container.querySelector('[data-dynamic]')!;
    expect(within(host as HTMLElement).getByRole('list')).toBeTruthy();
  });
});
