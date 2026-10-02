/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LICENCES } from './licences';
import { LicencesButton } from './LicencesDialog';

describe('Licences dialog (plan H-5)', () => {
  it('renders every licences.ts entry with its licence and link', () => {
    render(<LicencesButton />);
    fireEvent.click(screen.getByRole('button', { name: 'licences' }));
    const dialog = screen.getByRole('dialog', { name: 'Open-source licences' });
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(LICENCES.length);
    for (const entry of LICENCES) {
      const link = within(dialog).getByRole('link', { name: entry.name });
      expect(link.getAttribute('href')).toBe(entry.url);
      expect(link.closest('li')?.textContent).toContain(entry.licence);
    }
  });
});
