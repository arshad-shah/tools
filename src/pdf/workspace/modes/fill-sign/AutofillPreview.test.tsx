/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutofillPreview, type AutofillRow } from './AutofillPreview';

const rows: AutofillRow[] = [
  { fieldId: 'a', label: 'Surname', value: 'Doe' },
  { fieldId: 'b', label: 'Forename(s)', value: 'Jane' },
  { fieldId: 'c', label: 'Postcode', value: 'D02 XY45' },
];

describe('AutofillPreview', () => {
  it('fills only the checked rows, as one grouped step', () => {
    const dispatch = vi.fn();
    render(
      <AutofillPreview
        open
        onOpenChange={() => {}}
        rows={rows}
        toOp={(r) => ({
          type: 'flat.fill',
          params: { fieldId: r.fieldId, value: r.value },
        })}
        dispatch={dispatch}
        onEditDetails={() => {}}
      />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Forename(s): Jane' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fill 2 fields' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [ops, label] = dispatch.mock.calls[0];
    expect(
      ops.map((o: { params: { fieldId: string } }) => o.params.fieldId),
    ).toEqual(['a', 'c']);
    expect(label).toBe('Fill 2 fields from My details');
  });
});
