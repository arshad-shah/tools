import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
} from '@/shared/ui';
import { IconShieldCheck } from '@/shared/ui/icons';
import { PRIVACY_TEXT } from './privacy';

/** Where files go and what touches the network (plan G-7). */
export function PrivacyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Privacy</DialogTitle>
      </DialogHeader>
      <DialogBody className="flex items-start gap-3">
        <IconShieldCheck size="lg" className="mt-0.5 text-accent-fg" />
        <Text>{PRIVACY_TEXT}</Text>
      </DialogBody>
      <DialogFooter>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
