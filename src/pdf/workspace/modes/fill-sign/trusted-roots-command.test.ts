import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { makeChain } from '../../../../../test/fixtures/signing';
import { certDer } from '@/pdf/sign/pades/cert-info';
import { addTrustedRoot, loadTrustedRoots } from '@/pdf/sign/pades/trust';
import { getWorkspaceDb } from '../../workspace-db';
import { useTrustedRootsVersion } from '../../signatures';
import {
  CLEAR_TRUSTED_ROOTS,
  clearTrustedRootsCommand,
} from './trusted-roots-command';

describe('Clear trusted roots (Settings)', () => {
  it('is a Settings command that clears the roots and re-verifies', async () => {
    const db = (await getWorkspaceDb())!;
    await addTrustedRoot(db, certDer((await makeChain()).root));
    const before = useTrustedRootsVersion.getState().version;
    const cmd = clearTrustedRootsCommand();
    expect(cmd).toMatchObject({
      label: CLEAR_TRUSTED_ROOTS,
      group: 'Settings',
    });
    await cmd.run();
    expect(await loadTrustedRoots(db)).toEqual([]);
    expect(useTrustedRootsVersion.getState().version).toBe(before + 1);
  });
});
