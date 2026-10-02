/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putHandoff } from '@/shared/lib/handoff';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from '@/shared/workers/handlers';
import { REGEX_FORMAT_MIME } from './lib/handoff';
import { logSettings } from './settings';
import LogViewer from './Tool';

/**
 * An in-process "worker": the real text handlers behind a message loop, so
 * the viewer runs its actual store without a Worker.
 */
function loopback(): RpcEndpoint {
  const page = new EventTarget();
  const worker = new EventTarget();
  let alive = true;
  const side = (self: EventTarget, other: EventTarget): RpcEndpoint => ({
    postMessage: (data) =>
      queueMicrotask(() => {
        if (alive)
          other.dispatchEvent(
            new MessageEvent('message', { data: structuredClone(data) }),
          );
      }),
    addEventListener: (type, l) => self.addEventListener(type, l as never),
    removeEventListener: (type, l) =>
      self.removeEventListener(type, l as never),
  });
  exposeRpc(textHandlers, side(worker, page));
  return {
    ...side(page, worker),
    terminate: () => {
      alive = false;
    },
  };
}

vi.mock('@/shared/workers/text-client', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('@/shared/workers/text-client')>();
  return {
    ...real,
    createTextWorker: (opts: Parameters<typeof real.createTextWorker>[0]) =>
      real.createTextWorker({ ...opts, connect: loopback }),
  };
});

beforeEach(() => {
  logSettings.getSettings();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

const renderTool = () =>
  render(
    <MemoryRouter>
      <LogViewer />
    </MemoryRouter>,
  );

const count = () =>
  screen
    .getAllByRole('status')
    .find((s) => / of \d+ entr/.test(s.textContent ?? ''))?.textContent;

/** R41: Input and Output are tabs. */
const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));

async function loadSample() {
  tab('Input');
  fireEvent.click(screen.getByRole('button', { name: 'Load sample' }));
  tab('Output');
  // 15 lines, the stack trace grouped into its ERROR entry.
  await screen.findByText(/10 of 10 entries/, undefined, { timeout: 3000 });
}

describe('Log Viewer', () => {
  it('groups a stack trace into one entry and filters by level', async () => {
    renderTool();
    await loadSample();
    const log = screen.getByRole('log', { name: 'Log entries' });
    expect(within(log).getAllByRole('article').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^Error/ }));
    await screen.findByText(/2 of 10 entries/, undefined, { timeout: 3000 });
    expect(
      screen
        .getByRole('button', { name: /^Error/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('adds a field filter chip from "Filter to" and updates the count', async () => {
    renderTool();
    await loadSample();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Expand line 1' }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Filter to details userId=12345',
      }),
    );
    const chips = await screen.findByRole('list', { name: 'Active filters' });
    expect(within(chips).getByText('details=userId=12345')).toBeTruthy();
    await screen.findByText(/1 of 10 entries/, undefined, { timeout: 3000 });
    expect(count()).toMatch(/^1 of 10 entries/);

    fireEvent.click(
      within(chips).getByRole('button', {
        name: 'Remove filter details=userId=12345',
      }),
    );
    await screen.findByText(/10 of 10 entries/, undefined, { timeout: 3000 });
  });

  it('the column menu hides and shows summary columns (persisted)', async () => {
    renderTool();
    await loadSample();
    const log = screen.getByRole('log', { name: 'Log entries' });
    const cells = (c: string) => log.querySelectorAll(`[data-column="${c}"]`);
    await waitFor(() => expect(cells('line').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Line number' }));
    expect(cells('line')).toHaveLength(0);
    expect(cells('level').length).toBeGreaterThan(0);
    expect(logSettings.getSettings().columns).toEqual([
      'time',
      'level',
      'component',
    ]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Line number' }));
    expect(cells('line').length).toBeGreaterThan(0);
    expect(logSettings.getSettings().columns).toEqual([
      'line',
      'time',
      'level',
      'component',
    ]);
  });

  it('shows an invalid regex inline', async () => {
    renderTool();
    await loadSample();
    fireEvent.click(screen.getByRole('switch', { name: 'Regex' }));
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      {
        target: { value: '(' },
      },
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Invalid regex/,
    );
  });

  it('opens the custom format dialog prefilled from a Regex Tester hand-off', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: REGEX_FORMAT_MIME,
      text: JSON.stringify({
        pattern: '(?<level>\\w+) (?<msg>.*)',
        flags: 'i',
      }),
      sourceTool: 'regex-tester',
    });
    window.history.replaceState(null, '', `/?handoff=${id}`);
    renderTool();
    const dialog = await screen.findByRole('dialog', {
      name: 'Custom log format',
    });
    expect(
      (within(dialog).getByLabelText('Pattern') as HTMLInputElement).value,
    ).toBe('(?<level>\\w+) (?<msg>.*)');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
