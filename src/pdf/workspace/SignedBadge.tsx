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
import { signedBadgeTone } from './signed-badge-state';
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
  const tone = signedBadgeTone(reports);
  return (
    <>
      <Button
        variant="ghost"
        size={compact ? 'lg' : 'sm'}
        onClick={() => setOpen(true)}
      >
        <StatusDot tone={tone} decorative />
        <Badge tone={tone === 'accent' ? 'neutral' : tone} variant="soft">
          Signed
        </Badge>
        <span className="sr-only">
          {
            {
              accent: 'Show the signatures in this document',
              warning:
                'The signer of this document is not verified or it changed after signing. Show the signatures',
              danger:
                'A signature in this document does not check out. Show the signatures',
            }[tone]
          }
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
