/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

describe('RandomDataGenerator schema editor', () => {
  it('renames a nested field and keeps focus while typing', () => {
    render(<RandomDataGenerator />);
    // root: id, name, email, address; address is expanded: street, city, zipCode, country
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
    render(<RandomDataGenerator />);
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
    render(<RandomDataGenerator />);
    const address = nameInputs().find((el) => el.value === 'address')!;
    // root "name" (a string) now shares its name with the object
    fireEvent.change(address, { target: { value: 'name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field to name' }));
    expect(nameInputs().map((el) => el.value)).toEqual([
      'id',
      'name',
      'email',
      'name',
      'street',
      'city',
      'zipCode',
      'country',
      'field5',
    ]);
  });

  it('renames a nested field in place, leaving its siblings alone', () => {
    render(<RandomDataGenerator />);
    const city = nameInputs().find((el) => el.value === 'city')!;
    fireEvent.change(city, { target: { value: 'town' } });
    expect(nameInputs().map((el) => el.value)).toEqual([
      'id',
      'name',
      'email',
      'address',
      'street',
      'town',
      'zipCode',
      'country',
    ]);
  });
});
