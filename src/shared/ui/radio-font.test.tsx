/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FontSample } from './font-sample';
import { RadioGroup } from './radio-group';

describe('RadioGroup', () => {
  it('is a named group of radios that reports the picked value', () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Size"
        value="s"
        onValueChange={onValueChange}
        options={[
          { value: 's', label: 'S' },
          { value: 'm', label: 'M' },
        ]}
      />,
    );
    // A fieldset named by its (hidden) legend label: Cynosure's RadioGroup.
    const group = screen.getByRole('group', { name: 'Size' });
    expect(group.querySelectorAll('input[type=radio]')).toHaveLength(2);
    expect(
      (screen.getByRole('radio', { name: 'S' }) as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(onValueChange).toHaveBeenCalledWith('m');
  });
  it('disables every option', () => {
    render(
      <RadioGroup
        label="Size"
        value=""
        disabled
        onValueChange={() => {}}
        options={[{ value: 's', label: 'S' }]}
      />,
    );
    expect(
      (screen.getByRole('radio', { name: 'S' }) as HTMLInputElement).disabled,
    ).toBe(true);
  });
});

describe('FontSample', () => {
  it('renders text in the family and ink', () => {
    render(
      <FontSample family="Sign Caveat" color="#111827" aria-label="Preview">
        Ada
      </FontSample>,
    );
    const el = screen.getByLabelText('Preview');
    expect(el.style.fontFamily).toContain('Sign Caveat');
    expect(el.style.color).toBe('rgb(17, 24, 39)');
  });
  it('rejects an unvalidated colour', () => {
    expect(() =>
      render(
        <FontSample family="Sign Caveat" color="red;">
          x
        </FontSample>,
      ),
    ).toThrow(/#rrggbb/);
  });
});
