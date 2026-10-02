/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Select } from './select';

describe('Select', () => {
  it('renders items then labelled groups and reports changes', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <Select
        aria-label="Template"
        value=""
        onValueChange={onValueChange}
        items={[{ value: '', label: 'Pick one' }]}
        groups={[
          { label: 'Web', items: [{ value: 'url', label: 'URL' }] },
          { label: 'Data', items: [{ value: 'num', label: 'Number' }] },
        ]}
      />,
    );
    const groups = container.querySelectorAll('optgroup');
    expect([...groups].map((g) => g.label)).toEqual(['Web', 'Data']);
    expect(groups[0].querySelector('option')?.textContent).toBe('URL');
    fireEvent.change(screen.getByRole('combobox', { name: 'Template' }), {
      target: { value: 'num' },
    });
    expect(onValueChange).toHaveBeenCalledWith('num');
  });
});
