/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SignatureReport } from '@/pdf/sign/pades/verify';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import {
  WorkspaceContext,
  type WorkspaceActions,
} from '../../workspace-context';
import type { DocumentApi } from '../types';
import { signedFieldNames, useSignedFields } from './signed-fields';
import { fillSign } from './store';

vi.mock('../../workspace-db', () => ({ getWorkspaceDb: async () => null }));

const report = (fieldName: string) => ({ fieldName }) as SignatureReport;

describe('signed fields', () => {
  it('lists each signed field name once', () => {
    expect(
      signedFieldNames([report('A'), report('B'), report('A'), report('')]),
    ).toEqual(['A', 'B']);
  });

  it('records the original source signed fields for smart placement', async () => {
    const model = makeModel(makeState(1));
    const session = {
      model,
      blobs: { checkpointBytes: async () => new Uint8Array([1]) },
      services: {
        edit: { call: vi.fn(async () => [report('Approver')]) },
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceContext.Provider
        value={{ session } as unknown as WorkspaceActions}
      >
        {children}
      </WorkspaceContext.Provider>
    );
    const doc = { state: model.getState() } as DocumentApi;
    renderHook(() => useSignedFields(doc), { wrapper });
    const source = model.getState().checkpoints[0].sourceId;
    await waitFor(() =>
      expect(fillSign.get().signedFields[source]).toEqual(['Approver']),
    );
  });
});
