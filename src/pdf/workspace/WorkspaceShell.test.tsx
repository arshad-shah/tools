/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { IconModeOrganize, IconRotateCw } from '@/shared/ui/icons';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocInfo } from '@/pdf/render';
import { ModeToolbar } from './ModeToolbar';
import type { ModeManifest, ModeProps } from './modes/types';
import { DEFAULT_WORKSPACE_SETTINGS, useWorkspaceSettings } from './settings';
import { SourceDocs } from './source-docs';
import { WorkspaceShell } from './WorkspaceShell';

vi.mock('./modes/registry', async (orig) => {
  const real = await orig<typeof import('./modes/registry')>();
  const organize: ModeManifest = {
    id: 'organize',
    label: 'Organize',
    icon: IconModeOrganize,
    shortcut: '1',
    order: 1,
    load: async () => ({
      default: {
        operations: [],
        commands: () => [],
        Inspector: () => <p>Page properties</p>,
        Toolbar: ({ doc, selection }: ModeProps) => (
          <ModeToolbar
            groups={[
              {
                id: 'rotate',
                label: 'Rotate',
                items: [
                  {
                    id: 'rotate-right',
                    label: 'Rotate right',
                    icon: IconRotateCw,
                    kind: 'button',
                    onSelect: () =>
                      doc.dispatch({
                        type: 'page.rotate',
                        params: { pageIds: [doc.view.pages[0].id], delta: 90 },
                      }),
                  },
                  {
                    id: 'select-1',
                    label: 'Select page 1',
                    icon: IconRotateCw,
                    kind: 'button',
                    onSelect: () =>
                      selection.selectPages([doc.view.pages[0].id]),
                  },
                  {
                    id: 'select-2',
                    label: 'Select page 2',
                    icon: IconRotateCw,
                    kind: 'button',
                    onSelect: () =>
                      selection.selectPages([doc.view.pages[1].id]),
                  },
                ],
              },
            ]}
          />
        ),
      },
    }),
  };
  return {
    ...real,
    MODES: [organize],
    getMode: (id: string) => (id === 'organize' ? organize : undefined),
  };
});

const info: DocInfo = {
  docId: 'r1',
  pageCount: 3,
  pages: Array.from({ length: 3 }, () => ({
    width: 612,
    height: 792,
    view: [0, 0, 612, 792] as [number, number, number, number],
    rotate: 0 as const,
  })),
};

let phone = false;
beforeAll(() => {
  registerCoreOperations();
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO);
  vi.stubGlobal('IntersectionObserver', RO);
});
beforeEach(() => {
  phone = false;
  useWorkspaceSettings.setState(DEFAULT_WORKSPACE_SETTINGS);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (q: string) =>
      ({
        matches: q.includes('max-width: 899px') ? phone : false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => vi.restoreAllMocks());

function setup() {
  const model = makeModel();
  const render = {
    open: vi.fn(async () => info),
    close: vi.fn(async () => {}),
    onRestart: () => () => {},
    generation: () => 0,
  };
  const sourceDocs = new SourceDocs(render, async () => new Uint8Array());
  sourceDocs.seed('s0', info);
  const session = {
    model,
    blobs: new BlobStore(null, 'doc1'),
    services: inProcessServices({ render: render as never }),
    sourceDocs,
    db: null,
  };
  const ui = (
    <WorkspaceShell
      session={session}
      mode="organize"
      onModeChange={() => {}}
      onOpen={() => {}}
      onSearch={() => {}}
      onUnlock={() => {}}
      onOpenNew={() => {}}
      breadcrumb={<span>pdf / edit</span>}
    />
  );
  return { model, ui };
}

const key = (
  k: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });

describe('WorkspaceShell', () => {
  it('Standard: mode tabs, the mode toolbar and the page rail', async () => {
    const { ui } = setup();
    render(ui);
    expect(screen.getByRole('tablist', { name: 'Modes' })).toBeTruthy();
    expect(
      await screen.findByRole('toolbar', { name: 'Organize tools' }),
    ).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Pages' })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Pages' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
  });

  it('the inspector reopens when the selection changes', async () => {
    const { ui } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select page 1' }),
    );
    const props = () =>
      screen.queryByRole('complementary', { name: 'Properties' });
    expect(props()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close Properties' }));
    expect(props()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Select page 2' }));
    expect(props()).toBeTruthy();
  });

  it('Focus shows the inspector as a popover next to the selection', async () => {
    useWorkspaceSettings.setState({ layout: 'focus' });
    const { ui } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select page 1' }),
    );
    expect(screen.getByRole('dialog', { name: 'Properties' })).toBeTruthy();
    expect(
      screen.queryByRole('complementary', { name: 'Properties' }),
    ).toBeNull();
  });

  it('Standard: a visible Pages toggle brings a collapsed rail back', async () => {
    const { ui } = setup();
    render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    const toggle = screen.getByRole('button', { name: 'Page rail' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.queryByRole('complementary', { name: 'Pages' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Page rail' }));
    expect(screen.getByRole('complementary', { name: 'Pages' })).toBeTruthy();
  });

  it('registers the workspace commands in the command palette', async () => {
    const { ui } = setup();
    render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    const labels = queryCommands('')
      .flatMap((g) => g.commands)
      .map((c) => c.label);
    for (const l of [
      'Export PDF',
      'Undo',
      'Redo',
      'Toggle the page rail',
      'Zoom in',
      'Fit width',
    ])
      expect(labels).toContain(l);
  });

  it.each([
    ['focus', false],
    ['phone', true],
  ])('%s: touch targets are at least 44px', async (layout, isPhone) => {
    phone = isPhone;
    if (layout === 'focus') useWorkspaceSettings.setState({ layout: 'focus' });
    const { ui } = setup();
    render(ui);
    const tools = await screen.findByRole('toolbar', {
      name: 'Organize tools',
    });
    const big = (el: HTMLElement) =>
      /(^|\s)(size-touch|h-touch|min-h-touch)(\s|$)/.test(el.className);
    for (const b of within(tools).getAllByRole('button'))
      expect(big(b)).toBe(true);
    const bar = screen.getByRole('banner');
    for (const b of within(bar).getAllByRole('button'))
      expect(big(b)).toBe(true);
  });

  it('blocks editing while a checkpoint job runs', async () => {
    const { model, ui } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rotate right' }),
    );
    expect(
      screen
        .getByRole('button', { name: /^Undo/ })
        .getAttribute('aria-disabled'),
    ).toBe('false');
    let end = () => {};
    act(() => {
      end = model.beginJob();
    });
    expect(
      screen
        .getByRole('button', { name: 'Nothing to undo' })
        .getAttribute('aria-disabled'),
    ).toBe('true');
    const panel = document.getElementById('mode-panel')!;
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.getAttribute('aria-busy')).toBe('true');
    act(() => end());
    expect(document.getElementById('mode-panel')!.hasAttribute('inert')).toBe(
      false,
    );
  });

  it('F switches to Focus and remembers it', async () => {
    const { ui } = setup();
    render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    key('f');
    expect(useWorkspaceSettings.getState().layout).toBe('focus');
    expect(screen.getByRole('tablist', { name: 'Modes' })).toBeTruthy();
    // The palette is the toolbar now; the docked rail is a drawer.
    expect(screen.queryByRole('complementary', { name: 'Pages' })).toBeNull();
    expect(
      await screen.findByRole('toolbar', { name: 'Organize tools' }),
    ).toBeTruthy();
  });

  it('phones always use Focus with a large dock and no Focus toggle', async () => {
    phone = true;
    const { ui } = setup();
    render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    expect(screen.queryByRole('button', { name: 'Focus layout' })).toBeNull();
    expect(screen.getByRole('tablist', { name: 'Modes' })).toBeTruthy();
  });

  it('Mod+Z undoes and the announcer says what', async () => {
    const { ui, model } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rotate right' }),
    );
    expect(model.getView().pages[0].rotate).toBe(90);
    key('z', { ctrlKey: true });
    expect(model.getView().pages[0].rotate).toBe(0);
    expect(screen.getByTestId('workspace-announcer').textContent).toBe(
      'Undid: rotate page 1 clockwise',
    );
    expect(
      screen.getByRole('button', { name: 'Redo Rotate page 1 clockwise' }),
    ).toBeTruthy();
  });

  it('typing in the file name does not trigger shortcuts', async () => {
    const { ui, model } = setup();
    render(ui);
    const name = screen.getByRole('textbox', { name: 'Document name' });
    key('f', {}, name);
    expect(useWorkspaceSettings.getState().layout).toBe('standard');
    fireEvent.change(name, { target: { value: 'renamed.pdf' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(model.getState().name).toBe('renamed.pdf');
  });

  it('Esc in the file name cancels the edit and keeps the selection', async () => {
    const { ui, model } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select page 2' }),
    );
    const rail = screen.getByRole('listbox', { name: 'Pages' });
    const second = () =>
      within(rail).getByRole('option', { name: /^Page 2 of/ });
    expect(second().getAttribute('aria-selected')).toBe('true');
    const name = screen.getByRole('textbox', { name: 'Document name' });
    fireEvent.change(name, { target: { value: 'draft.pdf' } });
    key('Escape', {}, name);
    expect(second().getAttribute('aria-selected')).toBe('true');
    expect((name as HTMLInputElement).value).toBe('a.pdf');
    expect(model.getState().name).toBe('a.pdf');
  });

  it('workspace shortcuts sleep while a dialog is open', async () => {
    const { ui, model } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rotate right' }),
    );
    key('s', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /Export/ });
    key('f', {}, dialog);
    key('z', { ctrlKey: true }, dialog);
    expect(useWorkspaceSettings.getState().layout).toBe('standard');
    expect(model.getView().pages[0].rotate).toBe(90);
  });

  it('Esc closes the top overlay first, then clears the selection', async () => {
    const { ui } = setup();
    render(ui);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select page 2' }),
    );
    const rail = screen.getByRole('listbox', { name: 'Pages' });
    const second = () =>
      within(rail).getByRole('option', { name: /^Page 2 of/ });
    key('s', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /Export/ });
    key('Escape', {}, dialog);
    expect(screen.queryByRole('dialog', { name: /Export/ })).toBeNull();
    expect(second().getAttribute('aria-selected')).toBe('true');
    key('Escape');
    expect(second().getAttribute('aria-selected')).toBe('false');
  });

  it('skip links lead to the document and to the tools', async () => {
    const { ui } = setup();
    const { container } = render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    const [doc, tools] = [...container.querySelectorAll('a')];
    expect(doc.textContent).toBe('Skip to the document');
    expect(document.querySelector(doc.getAttribute('href')!)?.tagName).toBe(
      'MAIN',
    );
    expect(tools.textContent).toBe('Skip to the tools');
    expect(
      document.querySelector(tools.getAttribute('href')!)?.getAttribute('role'),
    ).toBe('tabpanel');
  });

  it('digit 1 activates Organize', async () => {
    const { ui } = setup();
    render(ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    key('1');
    const tabs = screen.getByRole('tablist', { name: 'Modes' });
    expect(
      within(tabs)
        .getByRole('tab', { name: /Organize/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });
});
