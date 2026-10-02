/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BlobStore } from '@/pdf/doc/blob-store';
import { SIGN_AND_PROTECT_MESSAGE } from '@/pdf/doc/export-stages/encrypt';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import { ExportDialog } from '../../ExportDialog';
import type { DocumentApi } from '../types';
import { DEVICE_CLOCK_NOTE } from './DigitalSignatureSection';
import { NEED_CERTIFICATE } from './digital-signature-options';

vi.mock('../../PreviewAsExported', () => ({
  PreviewAsExported: () => <p>preview</p>,
}));

beforeAll(() => registerCoreOperations());

function setup(protect = false) {
  const model = makeModel(makeState(2));
  if (protect)
    model.dispatch({
      type: 'protect.set',
      params: { enabled: true, permissions: DEFAULT_PERMISSIONS },
    });
  const session = {
    model,
    blobs: new BlobStore(null, 'doc1'),
    services: inProcessServices(),
    sourceDocs: {} as never,
    db: null,
  };
  render(
    <ExportDialog
      open
      onOpenChange={() => {}}
      session={session}
      doc={{ view: model.getView() } as DocumentApi}
      currentPage={null}
      selectedPages={[]}
      run={vi.fn()}
      save={vi.fn()}
    />,
  );
}

const turnOn = () =>
  fireEvent.click(
    screen.getByRole('switch', { name: 'Sign digitally (PAdES)' }),
  );

describe('DigitalSignatureSection', () => {
  it('relabels Export and waits for a certificate', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
    turnOn();
    const button = screen.getByRole('button', { name: 'Sign and export' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByText(NEED_CERTIFICATE).length).toBeGreaterThan(0);
  });

  it('refuses password protection together with a signature (G14)', () => {
    setup(true);
    turnOn();
    expect(
      screen
        .getByRole('button', { name: 'Sign and export' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getAllByText(SIGN_AND_PROTECT_MESSAGE).length,
    ).toBeGreaterThan(0);
  });

  it('says where the time comes from when the timestamp is off', () => {
    setup();
    turnOn();
    expect(screen.getByText(DEVICE_CLOCK_NOTE)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('switch', {
        name: 'Add a trusted timestamp (sends one request to the server below)',
      }),
    );
    expect(screen.queryByText(DEVICE_CLOCK_NOTE)).toBeNull();
    expect(screen.getByLabelText('Timestamp server')).toBeTruthy();
  });
});
