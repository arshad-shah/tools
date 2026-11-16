/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  queryCommands,
  registerCommandSource,
  resetCommandsForTests,
  type Command,
  type CommandSource,
} from './commands';

const cmd = (id: string, label: string, group: string): Command => ({
  id,
  label,
  group,
  run: () => {},
});

const tools: CommandSource = {
  id: 'tools',
  commands: () => [
    cmd('merge', 'Merge PDFs', 'Tools'),
    cmd('split', 'Split PDF', 'Tools'),
  ],
};
const pages: CommandSource = {
  id: 'pages',
  commands: () => [
    cmd('home', 'Home', 'Pages'),
    cmd('pdf', 'PDF hub', 'Pages'),
  ],
};
const goTo: CommandSource = {
  id: 'goto',
  commands: (q) => {
    const m = /^p\s*(\d+)$/.exec(q.trim());
    return m ? [cmd(`page-${m[1]}`, `Go to page ${m[1]}`, 'Actions')] : [];
  },
};

beforeEach(() => {
  localStorage.clear();
  resetCommandsForTests();
});

describe('command registry', () => {
  it('merges two sources into groups', () => {
    registerCommandSource(tools);
    registerCommandSource(pages);
    const groups = queryCommands('');
    expect(groups.map((g) => g.group)).toEqual(['Tools', 'Pages']);
    expect(groups[0].commands.map((c) => c.id)).toEqual(['merge', 'split']);
  });

  it('the disposer removes a source', () => {
    registerCommandSource(tools);
    const off = registerCommandSource(pages);
    off();
    expect(queryCommands('').map((g) => g.group)).toEqual(['Tools']);
  });

  it('a source answering "p 12" ranks first', () => {
    registerCommandSource(tools);
    registerCommandSource(pages);
    registerCommandSource(goTo);
    const groups = queryCommands('p 12');
    expect(groups[0].commands[0].label).toBe('Go to page 12');
  });

  it('a query filters and ranks', () => {
    registerCommandSource(tools);
    registerCommandSource(pages);
    const groups = queryCommands('mrg');
    expect(groups.flatMap((g) => g.commands).map((c) => c.id)).toEqual([
      'merge',
    ]);
  });
});
