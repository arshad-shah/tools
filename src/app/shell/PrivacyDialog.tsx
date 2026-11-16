import { Button, Dialog, Inline, IconTile, Text } from '@arshad-shah/cynosure';
import { shieldCheck } from '@arshad-shah/cynosure/icons';
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Privacy"
      actions={
        <Button
          variant="solid"
          tone="accent"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      }
    >
      <Inline gap="5" align="start">
        <IconTile icon={shieldCheck} tone="success" />
        <Text as="p">{PRIVACY_TEXT}</Text>
      </Inline>
    </Dialog>
  );
}
