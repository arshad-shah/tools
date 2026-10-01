/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/pdf/edit';
import { FieldControl } from './FieldControl';

describe('FieldControl', () => {
  it('labels a field with its alternate name and shows the field name too', () => {
    const field: FormField = {
      kind: 'text',
      name: 'topmostSubform[0].Page1[0].f1_01[0]',
      label: 'First name',
      value: '',
      multiline: false,
      maxLength: null,
      readOnly: false,
    };
    render(<FieldControl field={field} value="" onChange={() => {}} id="f0" />);
    expect(screen.getByLabelText('First name')).toBeTruthy();
    expect(
      screen.getByText('topmostSubform[0].Page1[0].f1_01[0]'),
    ).toBeTruthy();
  });

  it('renders a radio group as radio buttons', () => {
    const onChange = vi.fn();
    const field: FormField = {
      kind: 'radio',
      name: 'size',
      label: null,
      options: ['S', 'M', 'L'],
      selected: null,
      readOnly: false,
    };
    render(<FieldControl field={field} value="" onChange={onChange} id="f1" />);
    const group = screen.getByRole('radiogroup', { name: 'size' });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(4); // None + 3
    fireEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(onChange).toHaveBeenCalledWith('M');
  });
});
