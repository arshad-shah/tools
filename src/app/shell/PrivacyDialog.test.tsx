/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { MemoryRouter } from 'react-router-dom';
import { AppNav } from './AppNav';
import { HelpContext } from './help-context';
import { useHelpDialogs } from './HelpDialogs';
import { PRIVACY_TEXT } from './privacy';

const EXACT =
  'Your files are processed on this device. Documents you edit are saved only in this browser (you can clear them in settings). Optional network use: OCR language data from this site, and a timestamp server you choose when signing.';

function Harness() {
  const { dialogs, ...help } = useHelpDialogs();
  return (
    <HelpContext.Provider value={help}>
      <AppNav onSearch={() => {}} onPrivacy={help.openPrivacy} />
      {dialogs}
    </HelpContext.Provider>
  );
}
const renderHarness = () =>
  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );

const dialog = () => screen.getByRole('dialog', { name: 'Privacy' });

describe('Privacy note', () => {
  it('has the agreed wording', () => {
    expect(PRIVACY_TEXT).toBe(EXACT);
  });

  it('opens from the privacy status in the navigation', () => {
    renderHarness();
    const nav = screen.getByRole('navigation', { name: 'Tools navigation' });
    fireEvent.click(
      within(nav).getByRole('button', { name: 'Files stay on this device' }),
    );
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });

  it('opens from the help menu', () => {
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Privacy' }));
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });

  it('opens from Mod+K', () => {
    renderHarness();
    const cmd = queryCommands('privacy')
      .flatMap((g) => g.commands)
      .find((c) => c.label === 'Privacy');
    expect(cmd).toBeTruthy();
    act(() => void cmd!.run());
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });
});
