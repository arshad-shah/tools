/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { takeHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { SendToMenu } from './send-to-menu';

vi.mock('@/app/registry', async () => {
  const I = await import('@/shared/ui/icons');
  const tool = (
    id: string,
    category: string,
    name: string,
    accepts: object[],
    enabled = true,
  ) => ({
    id,
    slug: id,
    category,
    kind: 'tool',
    name,
    description: name,
    icon: I.IconBraces,
    keywords: [],
    accepts,
    enabled,
    load: async () => ({ default: () => null }),
  });
  const TOOLS = [
    tool('json-formatter', 'data', 'JSON Formatter', [
      { mimes: ['application/json'] },
    ]),
    tool('json-to-csv', 'data', 'JSON to CSV', [
      { mimes: ['application/json'] },
    ]),
    tool(
      'json-old',
      'data',
      'Old JSON',
      [{ mimes: ['application/json'] }],
      false,
    ),
    tool('jwt', 'security', 'JWT Decoder', [{ mimes: ['application/jwt'] }]),
    tool('csv', 'data', 'CSV Viewer', [{ kinds: ['csv'] }]),
  ];
  return {
    TOOLS,
    getEnabledTools: () => TOOLS.filter((t) => t.enabled),
    getTool: (id: string) => TOOLS.find((t) => t.id === id),
    toolsAccepting: (mime: string) =>
      TOOLS.filter(
        (t) =>
          t.enabled &&
          t.accepts.some((r: { mimes?: string[] }) => r.mimes?.includes(mime)),
      ),
  };
});

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/shared/lib/notify', () => ({ notify }));

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

function renderMenu(
  payload: () => HandoffPayload | null,
  source = 'json-formatter',
) {
  return render(
    <MemoryRouter initialEntries={['/data/json-formatter']}>
      <SendToMenu payload={payload} sourceTool={source} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const json = (): HandoffPayload => ({
  kind: 'text',
  mime: 'application/json',
  text: '{"a":1}',
  sourceTool: 'json-formatter',
});

const openMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send to' }));
  });
};

describe('SendToMenu', () => {
  it('computes the payload only when opened', async () => {
    const payload = vi.fn(json);
    renderMenu(payload);
    expect(payload).not.toHaveBeenCalled();
    await openMenu();
    expect(payload).toHaveBeenCalledTimes(1);
  });

  it('lists enabled tools accepting the mime, excluding the source', async () => {
    renderMenu(json);
    await openMenu();
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['JSON to CSV']);
    expect(items[0].querySelector('svg')).not.toBeNull();
  });

  it('selecting navigates to the tool with a hand-off id', async () => {
    renderMenu(json);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'JSON to CSV' }));
    const where = screen.getByTestId('where').textContent!;
    const m = /^\/data\/json-to-csv\?handoff=(.+)$/.exec(where);
    expect(m).not.toBeNull();
    expect(takeHandoff(m![1])).toEqual(json());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows the empty state when no other tool accepts the payload', async () => {
    renderMenu(() => ({
      kind: 'text',
      mime: 'text/x-nothing',
      text: 'x',
      sourceTool: 'json-formatter',
    }));
    await openMenu();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(screen.getByText('No other tool accepts this')).toBeTruthy();
  });

  it('says so when there is nothing to send', async () => {
    renderMenu(() => null);
    await openMenu();
    expect(screen.getByText('Nothing to send yet')).toBeTruthy();
  });

  it('lists tools accepting the file kinds for a files payload', async () => {
    renderMenu(() => ({
      kind: 'files',
      files: [new File(['a,b\n1,2\n3,4\n'], 'a.csv')],
    }));
    await openMenu();
    expect(
      await screen.findByRole('menuitem', { name: 'CSV Viewer' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });

  it('arrow keys move between items', async () => {
    renderMenu(
      () => ({
        kind: 'text',
        mime: 'application/json',
        text: '{}',
        sourceTool: 'jwt',
      }),
      'jwt',
    );
    await openMenu();
    const [first, second] = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End' });
    expect(document.activeElement).toBe(second);
  });
});
