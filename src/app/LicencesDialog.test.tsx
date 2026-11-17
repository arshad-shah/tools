/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LICENCES } from './licences';
import { LicencesDialog } from './LicencesDialog';

describe('Licences dialog (plan H-5)', () => {
  it('renders every licences.ts entry with its licence and link', () => {
    render(<LicencesDialog open onOpenChange={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Open-source licences' });
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(LICENCES.length);
    for (const entry of LICENCES) {
      const link = within(dialog)
        .getAllByRole('link')
        .find((a) => a.getAttribute('href') === entry.url)!;
      expect(link.textContent).toContain(entry.name);
      expect(link.closest('li')?.textContent).toContain(entry.licence);
    }
  });
});
