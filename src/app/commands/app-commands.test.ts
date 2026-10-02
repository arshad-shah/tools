import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  queryCommands,
  registerCommandSource,
  resetCommandsForTests,
} from '@/shared/lib/commands';
import { TOOLS } from '../registry';
import {
  favouriteCommands,
  routeCommands,
  themeCommands,
  toolCommands,
} from './app-commands';

afterEach(() => resetCommandsForTests());

const setup = (favs: string[] = []) => {
  const navigate = vi.fn();
  const setPreference = vi.fn();
  registerCommandSource(favouriteCommands(navigate, () => favs, TOOLS));
  registerCommandSource(routeCommands(navigate));
  registerCommandSource(toolCommands(navigate, TOOLS));
  registerCommandSource(themeCommands(setPreference));
  return { navigate, setPreference };
};
const labels = (q: string) =>
  queryCommands(q).flatMap((g) => g.commands.map((c) => c.label));

describe('app command sources', () => {
  it('ranks Regex Tester first for "regex" and navigates to its route', async () => {
    const { navigate } = setup();
    const first = queryCommands('regex')[0].commands[0];
    expect(first.label).toBe('Regex Tester');
    await first.run();
    expect(navigate).toHaveBeenCalledWith('/text/regex');
  });
  it('finds the PDF hub and PDF tools for "pdf"', () => {
    setup();
    const found = labels('pdf');
    expect(found).toContain('Go to PDF');
    expect(found).toContain('PDF Merger');
    expect(found).toContain('PDF Splitter');
  });
  it('finds tools by keyword', () => {
    setup();
    expect(labels('checksum')).toContain('Hash & Checksum');
  });
  it('lists favourites first on an empty query', () => {
    setup(['pomodoro', 'removed-tool']);
    const groups = queryCommands('');
    expect(groups[0].group).toBe('Favourites');
    expect(groups[0].commands.map((c) => c.label)).toEqual(['Pomodoro Timer']);
  });
  it('has no favourites group without favourites', () => {
    setup();
    expect(queryCommands('').map((g) => g.group)).not.toContain('Favourites');
  });
  it('switches the theme', async () => {
    const { setPreference } = setup();
    const cmd = queryCommands('light theme')[0].commands[0];
    expect(cmd.label).toBe('Use light theme');
    await cmd.run();
    expect(setPreference).toHaveBeenCalledWith('light');
  });
});
