import { Dialog, DialogBody, DialogHeader, DialogTitle } from '@/shared/ui';
import type { ModeProps } from '../types';
import { SignaturePanel } from './SignaturePanel';
import { fillSign, useFillSign } from './store';

/** "Signature" and "Initials" (toolbar): make one, then place it. */
export function SignatureDialog({ ctx }: { ctx: ModeProps }) {
  const open = useFillSign((s) => s.dialog === 'signature');
  const role = useFillSign((s) => s.panelRole);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) =>
        fillSign.set(
          o ? { dialog: 'signature' } : { dialog: null, signTarget: null },
        )
      }
    >
      <DialogHeader>
        <DialogTitle>
          {role === 'initials' ? 'Initials' : 'Signature'}
        </DialogTitle>
      </DialogHeader>
      <DialogBody>
        <SignaturePanel ctx={ctx} />
      </DialogBody>
    </Dialog>
  );
}
