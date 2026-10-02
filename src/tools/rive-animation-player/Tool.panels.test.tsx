/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { EventType } from '@/shared/ui/adapters/rive-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCommandsForTests } from '@/shared/lib/commands';
import { FakeRive } from './test/fake-rive';
import RiveAnimationPlayer from './Tool';

const speedSetter = vi.fn();
vi.mock('./lib/speed', () => ({
  attachSpeedControl: vi.fn(() => speedSetter),
}));
vi.mock('@rive-app/react-canvas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@rive-app/react-canvas')>()),
  Rive: (await import('./test/fake-rive')).FakeRive,
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const riv = () =>
  new File([new Uint8Array([0x52, 0x49, 0x56, 0x45, 1])], 'hero.riv');

async function loadFile() {
  const view = render(<RiveAnimationPlayer />);
  const input = view.container.querySelector(
    'input[type=file]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [riv()] } });
  await waitFor(() => expect(FakeRive.instances).toHaveLength(1));
  const rive = FakeRive.instances[0];
  act(() => rive.finishLoad());
  return { ...view, rive };
}

const openTab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name }));

beforeEach(() => {
  FakeRive.instances.length = 0;
  FakeRive.artboards = ['Main'];
  FakeRive.sizes = {};
  speedSetter.mockClear();
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => resetCommandsForTests());

describe('RiveAnimationPlayer timeline', () => {
  it('sets the runtime speed when a speed is picked', async () => {
    await loadFile();
    expect(speedSetter).toHaveBeenLastCalledWith(1);
    const speeds = screen.getByRole('radiogroup', { name: 'Playback speed' });
    fireEvent.click(within(speeds).getByRole('radio', { name: '0.5x' }));
    expect(speedSetter).toHaveBeenLastCalledWith(0.5);
    fireEvent.click(within(speeds).getByRole('radio', { name: '2x' }));
    expect(speedSetter).toHaveBeenLastCalledWith(2);
  });

  it('steps one frame (1/60 s) with the period key and back with the comma', async () => {
    const { rive } = await loadFile();
    expect(screen.getByRole('slider', { name: 'Scrub' })).toBeTruthy();
    expect(screen.getByText('0.00 s of 2.00 s')).toBeTruthy();

    fireEvent.keyDown(document.body, { key: '.' });
    expect(rive.pause).toHaveBeenLastCalledWith('idle');
    expect(rive.scrub).toHaveBeenLastCalledWith('idle', 1 / 60);
    fireEvent.keyDown(document.body, { key: '.' });
    expect(rive.scrub).toHaveBeenLastCalledWith('idle', 2 / 60);
    fireEvent.keyDown(document.body, { key: ',' });
    expect(rive.scrub).toHaveBeenLastCalledWith('idle', 1 / 60);
    expect(screen.getByText('0.02 s of 2.00 s')).toBeTruthy();
  });

  it('scrubs a linear animation from the slider', async () => {
    const { rive } = await loadFile();
    fireEvent.change(screen.getByRole('slider', { name: 'Scrub' }), {
      target: { value: '1' },
    });
    expect(rive.scrub).toHaveBeenLastCalledWith('idle', 1);
  });

  it('hides the scrubber for state machines', async () => {
    await loadFile();
    fireEvent.click(screen.getByRole('tab', { name: 'State machines' }));
    expect(screen.queryByRole('slider', { name: 'Scrub' })).toBeNull();
    expect(screen.getByText(/Scrubbing and frame stepping work/)).toBeTruthy();
  });
});

describe('RiveAnimationPlayer panels', () => {
  it('appends each Rive event to the log, and clears it', async () => {
    const { rive } = await loadFile();
    openTab('Info');
    expect(screen.getByText(/No events yet/)).toBeTruthy();

    act(() =>
      rive.emit(EventType.RiveEvent, {
        name: 'Clicked',
        properties: { score: 3 },
      }),
    );
    act(() => rive.emit(EventType.RiveEvent, { name: 'Landed' }));
    const log = screen.getByRole('log', { name: 'Rive events' });
    expect(within(log).getByText('Clicked')).toBeTruthy();
    expect(within(log).getByText('score: 3')).toBeTruthy();
    expect(within(log).getByText('Landed')).toBeTruthy();
    expect(screen.getByText('2 events')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('log', { name: 'Rive events' })).toBeNull();
  });

  it('lists every artboard of the file with its size', async () => {
    FakeRive.artboards = ['Main', 'Alt', 'Icon'];
    FakeRive.sizes = { Icon: { width: 64, height: 64 } };
    await loadFile();
    openTab('Info');
    expect(screen.getByText('3 artboards')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Artboards' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      rows.map((r) => within(r).getAllByRole('cell')[0].textContent),
    ).toEqual(['Main Active', 'Alt', 'Icon']);
    expect(within(rows[2]).getByText('64 by 64')).toBeTruthy();
    expect(
      screen.getByText('Format version: Not stored in this file'),
    ).toBeTruthy();
    expect(screen.queryByText(/Unknown/)).toBeNull();
  });

  it('copies the embed snippet for the chosen artboard and state machine', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await loadFile();
    openTab('Export');
    // A read-only text panel: its toolbar holds Copy (and Download).
    const panel = screen.getByRole('group', { name: 'Embed snippet panel' });
    expect(
      within(panel).getByRole('button', { name: 'Download' }),
    ).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const code = (writeText.mock.calls[0] as unknown as [string])[0];
    expect(code).toContain(
      "useRive({ src: '/hero.riv', artboard: 'Main', stateMachines: 'machine', autoplay: true })",
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Web' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect((writeText.mock.calls[1] as unknown as [string])[0]).toContain(
      "import { Rive } from '@rive-app/canvas';",
    );
  });

  it('draws selections as pressed buttons, never primary', async () => {
    await loadFile();
    openTab('Stage');
    const white = screen.getByRole('button', { name: 'White' });
    fireEvent.click(white);
    expect(
      screen
        .getByRole('button', { name: 'White' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('button', { name: 'White' }).className).not.toMatch(
      /bg-accent\b/,
    );
    const center = screen.getByRole('button', { name: 'Center' });
    expect(center.getAttribute('aria-pressed')).toBe('true');
    expect(center.className).not.toMatch(/bg-accent\b/);
  });

  it('says so when the file has no data bindings', async () => {
    await loadFile();
    openTab('Data');
    expect(screen.getByText('This file has no data bindings.')).toBeTruthy();
  });

  it('remembers the speed in the tool settings', async () => {
    await loadFile();
    fireEvent.click(screen.getByRole('radio', { name: '1.5x' }));
    expect(
      localStorage.getItem('kit:store:tool:rive-animation-player'),
    ).toContain('"speed":1.5');
  });
});
