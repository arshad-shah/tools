import { Badge, Button, StatusDot } from '@/shared/ui';
import { useDocumentSignatures } from './signatures';
import type { WorkspaceSession } from './session';

/**
 * Top-bar "Signed" badge (plan H-14): shown when the original document
 * carries signatures; the dot says whether they all check out. Opens the
 * Signatures panel (Fill & Sign inspector).
 */
export function SignedBadge({
  session,
  onOpen,
  compact,
}: {
  session: WorkspaceSession;
  onOpen(): void;
  compact?: boolean;
}) {
  const { reports } = useDocumentSignatures(session);
  if (!reports?.length) return null;
  const ok = reports.every((r) => r.integrity === 'intact' && r.signatureValid);
  return (
    <Button variant="ghost" size={compact ? 'lg' : 'sm'} onClick={onOpen}>
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
  );
}
