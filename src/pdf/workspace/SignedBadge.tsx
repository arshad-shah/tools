import { Button, Dialog } from '@arshad-shah/cynosure';
import {
  signatureBroken,
  signatureUnknown,
  signatureVerified,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { SignaturesPanel } from './modes/fill-sign/SignaturesPanel';
import { useDocumentSignatures } from './signatures';
import { signedBadgeTone } from './signed-badge-state';
import type { WorkspaceSession } from './session';

const LOOK = {
  accent: {
    icon: signatureVerified,
    tone: 'success',
    name: 'Signed: show the signatures in this document',
  },
  warning: {
    icon: signatureUnknown,
    tone: 'warning',
    name: 'Signed: the signer of this document is not verified or it changed after signing. Show the signatures',
  },
  danger: {
    icon: signatureBroken,
    tone: 'danger',
    name: 'Signed: a signature in this document does not check out. Show the signatures',
  },
} as const;

/**
 * The header's "Signed" button: shown when the original document carries
 * signatures, coloured by whether they all check out. Opens the list.
 */
export function SignedBadge({
  session,
  compact,
}: {
  session: WorkspaceSession;
  compact?: boolean;
}) {
  const signatures = useDocumentSignatures(session);
  const [open, setOpen] = useState(false);
  const { reports } = signatures;
  if (!reports?.length) return null;
  const look = LOOK[signedBadgeTone(reports)];
  return (
    <>
      <Button
        variant="soft"
        tone={look.tone}
        size={compact ? 'lg' : 'sm'}
        icon={look.icon}
        aria-label={look.name}
        onClick={() => setOpen(true)}
      >
        Signed
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="Signatures in this document"
        actions={
          <Button variant="solid" tone="accent" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <SignaturesPanel signatures={signatures} />
      </Dialog>
    </>
  );
}
