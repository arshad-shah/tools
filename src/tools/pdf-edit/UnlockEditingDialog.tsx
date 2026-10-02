import { useState } from 'react';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { PasswordPrompt } from '@/pdf/components/PasswordPrompt';
import { blobKey } from '@/pdf/doc/serialize';
import type { WorkspaceSession } from '@/pdf/workspace/session';

export interface UnlockEditingDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  session: WorkspaceSession;
  /** The encrypted original (kept with a saved copy); null when it is not. */
  original: Uint8Array | null;
}

/**
 * Restricted documents (spec §12): editing needs the owner password, checked
 * by qpdf against the original file. No permission bypass.
 */
export function UnlockEditingDialog({
  open,
  onOpenChange,
  session,
  original,
}: UnlockEditingDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = session.model.getState().name;

  const submit = async (password: string) => {
    if (!original) return;
    setBusy(true);
    setError(null);
    try {
      const role = await session.services.qpdf.passwordRole(original, password);
      if (role !== 'owner') {
        setError('That is not the owner password');
        return;
      }
      session.model.unrestrict();
      // Unlocked for good: the saved original is no longer needed.
      void session.blobs
        .drop([blobKey.original(session.model.getState().id)])
        .catch(() => {});
      notify.success('Editing unlocked');
      onOpenChange(false);
    } catch (e) {
      setError(toToolError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Unlock editing</DialogTitle>
        <DialogDescription>
          {original
            ? 'The owner of this PDF restricted changes. Enter the owner password to edit it.'
            : 'Open the original file again to unlock editing: it is not kept on this device.'}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        {original ? (
          <PasswordPrompt
            fileName={name}
            error={error}
            busy={busy}
            onSubmit={(pw) => void submit(pw)}
            submitLabel="Unlock editing"
            description="The password is checked in your browser and never uploaded."
          />
        ) : null}
      </DialogBody>
    </Dialog>
  );
}
