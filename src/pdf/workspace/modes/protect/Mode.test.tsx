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
import { registerCoreOperations } from '@/pdf/doc/ops';
import { shellHarness, stubLayoutApis } from '../../test-shell';
import { WorkspaceShell } from '../../WorkspaceShell';
import { previewLines, type SanitizePreview } from './protect-ui';

beforeAll(() => registerCoreOperations());
beforeEach(() => stubLayoutApis());
afterEach(() => vi.restoreAllMocks());

async function open(restricted = false) {
  const h = shellHarness();
  if (restricted) h.model.getState().restricted = true;
  const onUnlock = vi.fn();
  render(
    <WorkspaceShell
      session={h.session}
      mode="protect"
      onModeChange={() => {}}
      onOpen={() => {}}
      onSearch={() => {}}
      onUnlock={onUnlock}
      onOpenNew={() => {}}
      breadcrumb={<span>pdf / edit</span>}
    />,
  );
  const toolbar = await screen.findByRole('toolbar', { name: 'Protect tools' });
  return { ...h, toolbar, onUnlock };
}

describe('Protect mode', () => {
  it('shows protection in the inspector and switches to document properties', async () => {
    const { toolbar, session, model } = await open();
    session.blobs.addCheckpoint(model.currentCheckpoint(), new Uint8Array([1]));
    const call = vi.fn(async () => ({
      title: 'Board pack',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      hasXmp: false,
    }));
    session.services.edit = { ...session.services.edit, call } as never;
    expect(
      screen.getByRole('switch', { name: 'Password protection' }),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(
        within(toolbar).getByRole('button', { name: 'Document properties' }),
      );
    });
    const title = await screen.findByLabelText('Title');
    expect((title as HTMLInputElement).value).toBe('Board pack');
    expect(call).toHaveBeenCalledWith(
      'getMetadata',
      [new Uint8Array([1])],
      expect.anything(),
    );
    fireEvent.change(title, { target: { value: 'Minutes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save properties' }));
    expect(model.getState().log.at(-1)).toMatchObject({
      type: 'meta.set',
      params: { patch: { title: 'Minutes' } },
    });
  });

  it('a restricted document offers Unlock for editing', async () => {
    const { toolbar, onUnlock } = await open(true);
    fireEvent.click(
      within(toolbar).getByRole('button', { name: 'Unlock for editing' }),
    );
    expect(onUnlock).toHaveBeenCalled();
    expect(
      screen.getByText(
        'This PDF restricts editing. Enter its owner password to make changes.',
      ),
    ).toBeTruthy();
  });
});

describe('previewLines', () => {
  it('lists the chosen kinds once each', () => {
    const p: SanitizePreview = {
      scripts: ['Open action', 'Page thumbnails on 2 pages'],
      attachments: ['1 attachment', 'Page thumbnails on 2 pages'],
      links: [],
      metadata: ['Document properties'],
      hiddenLayers: [],
    };
    expect(
      previewLines(p, {
        scripts: true,
        attachments: true,
        links: true,
        metadata: false,
        hiddenLayers: false,
      }),
    ).toEqual(['Open action', 'Page thumbnails on 2 pages', '1 attachment']);
  });
});
