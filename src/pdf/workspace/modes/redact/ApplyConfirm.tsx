import { Button, Dialog, Notice } from '@arshad-shah/cynosure';
import { applyMessage } from './marks';

export interface ApplyConfirmProps {
  open: boolean;
  areas: number;
  pages: number;
  tagged: boolean;
  onCancel(): void;
  onApply(): void;
}

export function ApplyConfirm({
  open,
  areas,
  pages,
  tagged,
  onCancel,
  onApply,
}: ApplyConfirmProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title="Apply redactions"
      description={applyMessage(areas, pages)}
      size="sm"
      actions={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="solid" tone="danger" onClick={onApply}>
            Apply redactions
          </Button>
        </>
      }
    >
      {tagged ? (
        <Notice tone="warning" size="sm">
          Tagged structure (used by screen readers) will be removed from this
          document.
        </Notice>
      ) : null}
    </Dialog>
  );
}
