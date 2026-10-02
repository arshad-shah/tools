/** @vitest-environment jsdom */
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockSettings } from './settings';
import RandomDataGenerator from './Tool';

const nameInputs = () =>
  screen.getAllByLabelText('Field name') as HTMLInputElement[];

/** Type one character at a time, like a user, keeping focus on the input. */
function typeInto(input: HTMLInputElement, text: string) {
  for (const ch of text) {
    const current = nameInputs().find((el) => el === document.activeElement);
    const target = current ?? input;
    fireEvent.change(target, { target: { value: target.value + ch } });
  }
}

/** The Users preset is the default; its address object starts collapsed. */
function renderExpanded() {
  render(<RandomDataGenerator />);
  fireEvent.click(screen.getByRole('button', { name: 'Expand field' }));
}

describe('RandomDataGenerator schema editor', () => {
  // The schema is persisted settings: start every test from the default.
  beforeEach(() =>
    renderHook(() => mockSettings.useSettings()).result.current[2](),
  );

  it('renames a nested field and keeps focus while typing', () => {
    renderExpanded();
    // root: id, name, email, phone, birthday, address (street, city, postcode, country), avatar, createdAt
    const city = nameInputs().find((el) => el.value === 'city')!;
    city.focus();
    typeInto(city, 'X');
    typeInto(nameInputs().find((el) => el === document.activeElement)!, 'Y');

    const focused = document.activeElement as HTMLInputElement;
    expect(focused).toBe(city);
    expect(focused.value).toBe('cityXY');
    expect(nameInputs().map((el) => el.value)).toContain('cityXY');
  });

  it('keeps an object expanded and focused while it is renamed', () => {
    renderExpanded();
    const address = nameInputs().find((el) => el.value === 'address')!;
    address.focus();
    typeInto(address, '2');

    expect(document.activeElement).toBe(address);
    expect(address.value).toBe('address2');
    // the nested children are still rendered
    expect(nameInputs().map((el) => el.value)).toContain('street');
    expect(
      screen.getByRole('button', { name: 'Add field to address2' }),
    ).toBeTruthy();
  });

  it('adds a child to the object whose button was pressed, even if an earlier field shares its name', () => {
    renderExpanded();
    const address = nameInputs().find((el) => el.value === 'address')!;
    // root "name" (a string) now shares its name with the object
    fireEvent.change(address, { target: { value: 'name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field to name' }));
    expect(nameInputs().map((el) => el.value)).toEqual([
      'id',
      'name',
      'email',
      'phone',
      'birthday',
      'name',
      'street',
      'city',
      'postcode',
      'country',
      'field5',
      'avatar',
      'createdAt',
    ]);
  });

  it('renames a nested field in place, leaving its siblings alone', () => {
    renderExpanded();
    const city = nameInputs().find((el) => el.value === 'city')!;
    fireEvent.change(city, { target: { value: 'town' } });
    expect(nameInputs().map((el) => el.value)).toEqual([
      'id',
      'name',
      'email',
      'phone',
      'birthday',
      'address',
      'street',
      'town',
      'postcode',
      'country',
      'avatar',
      'createdAt',
    ]);
  });

  it('shows the schema and preview as tabs, the preview empty before a run', () => {
    render(<RandomDataGenerator />);
    const tabs = screen.getByRole('tablist', { name: 'Mock data panes' });
    expect(tabs).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Schema' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    expect(screen.getByText('No data yet')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Schema' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Schema' }));
    expect(screen.getAllByLabelText('Field name').length).toBeGreaterThan(0);
  });
});
