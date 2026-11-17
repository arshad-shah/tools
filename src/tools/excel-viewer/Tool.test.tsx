/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ExcelViewer from './Tool';

const renderTool = () =>
  render(
    <MemoryRouter>
      <ExcelViewer />
    </MemoryRouter>,
  );

describe('Excel Viewer', () => {
  it('starts with a drop zone', () => {
    renderTool();
    expect(screen.getByRole('heading', { name: 'Workbook' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open a sample' })).toBeTruthy();
  });

  it('opens the sample: sheet tabs, counts and the hidden sheet', async () => {
    renderTool();
    fireEvent.click(screen.getByRole('button', { name: 'Open a sample' }));
    expect(
      await screen.findByRole('heading', { name: 'sample.xlsx' }),
    ).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Orders' })).toBeTruthy();
    expect(screen.getByText('8 rows')).toBeTruthy();
    expect(screen.getByText('1 merged range')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cell' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Lookup \(hidden\)/ }));
    expect(await screen.findByText('Hidden sheet')).toBeTruthy();
    expect(screen.getByText('1 row')).toBeTruthy();
  });
});
