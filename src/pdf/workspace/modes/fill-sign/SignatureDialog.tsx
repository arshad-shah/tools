import { Dialog } from '@arshad-shah/cynosure';
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
      title={role === 'initials' ? 'Initials' : 'Signature'}
      size="lg"
    >
      <SignaturePanel ctx={ctx} />
    </Dialog>
  );
}
