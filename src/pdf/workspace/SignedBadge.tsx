import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusDot,
} from '@/shared/ui';
import { SignaturesPanel } from './modes/fill-sign/SignaturesPanel';
import { useDocumentSignatures } from './signatures';
import type { WorkspaceSession } from './session';

/**
 * Top-bar "Signed" badge (plan H-14): shown when the original document
 * carries signatures; the dot says whether they all check out. Opens the
 * Signatures panel.
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
  const ok = reports.every((r) => r.integrity === 'intact' && r.signatureValid);
  return (
    <>
      <Button
        variant="ghost"
        size={compact ? 'lg' : 'sm'}
        onClick={() => setOpen(true)}
      >
        <StatusDot tone={ok ? 'accent' : 'danger'} decorative />
        <Badge tone={ok ? 'neutral' : 'danger'} variant="soft">
          Signed
        </Badge>
        <span className="sr-only">
          {ok
            ? 'Show the signatures in this document'
            : 'A signature in this document does not check out. Show the signatures'}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen} size="lg">
        <DialogHeader>
          <DialogTitle>Signatures in this document</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <SignaturesPanel signatures={signatures} />
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
