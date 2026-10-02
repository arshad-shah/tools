import { useContext, useEffect } from 'react';
import type { SignatureReport } from '@/pdf/sign/pades/verify';
import { useDocumentSignatures } from '../../signatures';
import { WorkspaceContext } from '../../workspace-context';
import type { DocumentApi } from '../types';
import { fillSign } from './store';

/** The field names that hold a signature, as the verifier reports them. */
export const signedFieldNames = (reports: readonly SignatureReport[]) => [
  ...new Set(reports.map((r) => r.fieldName).filter(Boolean)),
];

/**
 * Records which /Sig fields of the original document are signed, so smart
 * placement does not offer them as places to sign (pdf.js cannot tell).
 * Signatures are verified over the original bytes (checkpoint 0).
 */
export function useSignedFields(doc: DocumentApi): void {
  const session = useContext(WorkspaceContext)?.session ?? null;
  const { reports } = useDocumentSignatures(session);
  const sourceId = doc.state.checkpoints[0]?.sourceId;
  useEffect(() => {
    if (!sourceId || !reports) return;
    fillSign.set({
      signedFields: {
        ...fillSign.get().signedFields,
        [sourceId]: signedFieldNames(reports),
      },
    });
  }, [sourceId, reports]);
}
