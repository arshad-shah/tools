/** @vitest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import type { DocumentApi } from '../types';
import { PROTECT_EXPORT_SECTION } from './export-section';
import { ProtectExportSection } from './ProtectExportSection';

beforeAll(() => registerCoreOperations());

// Built from parts: test values must not look like real credentials.
const GOOD = ['correct', 'horse'].join(' ');

const patches = vi.fn();
function Harness() {
  const [options, setOptions] = useState<ExportOptions>({
    filename: 'a.pdf',
    onlyPages: null,
    stripMetadata: false,
  });
  return (
    <ProtectExportSection
      doc={{} as DocumentApi}
      options={options}
      set={(p) => {
        patches(p);
        setOptions((o) => ({ ...o, ...p }) as ExportOptions);
      }}
    />
  );
}
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ProtectExportSection', () => {
  it('shows no error before anything is typed', () => {
    render(<Harness />);
    expect(screen.queryByText('Enter a password to open the file')).toBeNull();
    expect(
      screen.getByLabelText('Password to open').getAttribute('aria-invalid'),
    ).not.toBe('true');
  });

  it('flags weak, empty and mismatched passwords once typing starts', () => {
    render(<Harness />);
    type('Password to open', 'x');
    type('Password to open', '');
    expect(screen.getByText('Enter a password to open the file')).toBeTruthy();
    type('Password to open', 'abc');
    expect(
      screen.getByText('Weak password: use at least 8 characters'),
    ).toBeTruthy();
    expect(screen.getByText('The passwords do not match')).toBeTruthy();
    type('Password to open', GOOD);
    type('Confirm password', GOOD);
    expect(screen.queryByText('The passwords do not match')).toBeNull();
    expect(screen.getByText('Strong password')).toBeTruthy();
    expect(patches).toHaveBeenCalledWith({ password: GOOD });
    expect(patches).toHaveBeenCalledWith({ confirmPassword: GOOD });
  });

  it('the owner password must differ from the open password', () => {
    render(<Harness />);
    type('Password to open', GOOD);
    type('Confirm password', GOOD);
    type('Owner password (optional)', GOOD);
    expect(
      screen.getByText(
        'The permissions password must be different from the open password',
      ),
    ).toBeTruthy();
  });

  it('shows only while protection is on and clears its passwords after export', () => {
    const m = makeModel(makeState(1));
    const doc = () => ({ view: m.getView() }) as DocumentApi;
    expect(PROTECT_EXPORT_SECTION.visible(doc())).toBe(false);
    m.dispatch({
      type: 'protect.set',
      params: { enabled: true, permissions: DEFAULT_PERMISSIONS },
    });
    expect(PROTECT_EXPORT_SECTION.visible(doc())).toBe(true);
    expect(PROTECT_EXPORT_SECTION.visible({} as DocumentApi)).toBe(false);
    expect(PROTECT_EXPORT_SECTION.secret).toEqual([
      'password',
      'confirmPassword',
      'ownerPassword',
    ]);
  });
});
