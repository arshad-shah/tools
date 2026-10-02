import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
} from '@/shared/ui';
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
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogHeader>
        <DialogTitle>Apply redactions</DialogTitle>
        <DialogDescription>{applyMessage(areas, pages)}</DialogDescription>
      </DialogHeader>
      {tagged ? (
        <DialogBody>
          <Text size="sm" tone="muted">
            Tagged structure (used by screen readers) will be removed from this
            document.
          </Text>
        </DialogBody>
      ) : null}
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onApply}>
          Apply redactions
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
