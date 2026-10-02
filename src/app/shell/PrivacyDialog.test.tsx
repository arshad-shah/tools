/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import Footer from '../Footer';
import { HelpContext } from './help-context';
import { useHelpDialogs } from './HelpDialogs';
import { HelpMenu } from './HelpMenu';
import { PRIVACY_TEXT } from './privacy';

const EXACT =
  'Your files are processed on this device. Documents you edit are saved only in this browser (you can clear them in settings). Optional network use: OCR language data from this site, and a timestamp server you choose when signing.';

function Harness() {
  const { dialogs, ...help } = useHelpDialogs();
  return (
    <HelpContext.Provider value={help}>
      <HelpMenu />
      <Footer />
      {dialogs}
    </HelpContext.Provider>
  );
}

const dialog = () => screen.getByRole('dialog', { name: 'Privacy' });

describe('Privacy note', () => {
  it('has the agreed wording', () => {
    expect(PRIVACY_TEXT).toBe(EXACT);
  });

  it('opens from the footer', () => {
    render(<Harness />);
    const footer = screen.getByRole('contentinfo');
    fireEvent.click(within(footer).getByRole('button', { name: 'Privacy' }));
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });

  it('opens from the help menu', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Privacy' }));
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });

  it('opens from Mod+K', () => {
    render(<Harness />);
    const cmd = queryCommands('privacy')
      .flatMap((g) => g.commands)
      .find((c) => c.label === 'Privacy');
    expect(cmd).toBeTruthy();
    act(() => void cmd!.run());
    expect(within(dialog()).getByText(EXACT)).toBeTruthy();
  });
});
