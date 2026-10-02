/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { IconModeEdit, IconModeOrganize } from '@/shared/ui/icons';
import type { ModeId } from '@/pdf/doc/types';
import { ModeHost } from './ModeHost';
import type { ModeContext, ModeManifest, ModeModule } from './modes/types';

function fakeMode(id: ModeId, label: string, extra: Partial<ModeModule> = {}) {
  const module: ModeModule = {
    operations: [],
    Toolbar: () => <p>{label} toolbar</p>,
    commands: () => [
      {
        id: `${id}-cmd`,
        label: `${label} command`,
        group: 'Actions',
        run() {},
      },
    ],
    onEnter: vi.fn(),
    onLeave: vi.fn(),
    ...extra,
  };
  const manifest: ModeManifest = {
    id,
    label,
    icon: id === 'organize' ? IconModeOrganize : IconModeEdit,
    shortcut: '1',
    order: 1,
    load: async () => ({ default: module }),
  };
  return { module, manifest };
}

const ctx = {} as ModeContext;

function Harness({ modes }: { modes: Record<string, ModeManifest> }) {
  const [mode, setMode] = useState<ModeId>('organize');
  return (
    <ModeHost manifest={modes[mode]} ctx={ctx} onModeChange={setMode}>
      {({ toolbar, request }) => (
        <>
          <div data-testid="slot">{toolbar}</div>
          <button onClick={() => request('edit')}>to edit</button>
          <span data-testid="mode">{mode}</span>
        </>
      )}
    </ModeHost>
  );
}

describe('ModeHost', () => {
  it('renders the toolbar and registers commands only while active', async () => {
    const a = fakeMode('organize', 'Organize');
    const b = fakeMode('edit', 'Edit');
    render(<Harness modes={{ organize: a.manifest, edit: b.manifest }} />);
    expect(await screen.findByText('Organize toolbar')).toBeTruthy();
    const labels = () =>
      queryCommands('command').flatMap((g) => g.commands.map((c) => c.label));
    expect(labels()).toContain('Organize command');
    expect(a.module.onEnter).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('to edit'));
    expect(await screen.findByText('Edit toolbar')).toBeTruthy();
    expect(a.module.onLeave).toHaveBeenCalledTimes(1);
    expect(b.module.onEnter).toHaveBeenCalledTimes(1);
    expect(labels()).toContain('Edit command');
    expect(labels()).not.toContain('Organize command');
  });

  it('asks before leaving when canExit gives a reason', async () => {
    const a = fakeMode('organize', 'Organize', {
      canExit: () => 'Your signature is not placed yet.',
    });
    const b = fakeMode('edit', 'Edit');
    render(<Harness modes={{ organize: a.manifest, edit: b.manifest }} />);
    await screen.findByText('Organize toolbar');
    fireEvent.click(screen.getByText('to edit'));
    expect(screen.getByText('Your signature is not placed yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByTestId('mode').textContent).toBe('organize');
    fireEvent.click(screen.getByText('to edit'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    });
    expect(screen.getByTestId('mode').textContent).toBe('edit');
  });
});
