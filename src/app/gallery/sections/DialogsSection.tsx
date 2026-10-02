import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  Text,
} from '@/shared/ui';
import { notify } from '@/shared/lib/notify';
import { Row, Section } from '../Section';

/**
 * Overlays that cover the page. Each opens on demand; the visual suite
 * opens them one at a time and screenshots the viewport.
 */
export function DialogsSection() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const showToasts = () => {
    notify.success('Saved 3 files', { duration: Infinity });
    notify.info('Page deleted', {
      duration: Infinity,
      action: { label: 'Undo', onClick: () => {} },
    });
    notify.error('That file is not a PDF', { duration: Infinity });
  };
  return (
    <Section name="dialogs" title="Dialogs, drawer, toasts">
      <Row label="Open on demand">
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Button onClick={() => setDrawer(true)}>Open drawer</Button>
        <Button onClick={showToasts}>Show toasts</Button>
      </Row>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogHeader>
          <DialogTitle>Delete 3 pages?</DialogTitle>
          <DialogDescription>
            The pages are removed from this document. You can undo it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Text size="sm" tone="muted">
            Pages 4, 7 and 9 are selected.
          </Text>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialog(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setDialog(false)}>
            Delete pages
          </Button>
        </DialogFooter>
      </Dialog>
      <Drawer open={drawer} onOpenChange={setDrawer} title="Settings">
        <Text size="sm" tone="muted">
          Drawer content: settings and secondary panels.
        </Text>
      </Drawer>
    </Section>
  );
}
