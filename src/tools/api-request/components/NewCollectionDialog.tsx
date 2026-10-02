import React from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Stack,
} from '@/shared/ui';

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newCollectionName: string;
  setNewCollectionName: (name: string) => void;
  onCreate: () => void;
}

export const NewCollectionDialog: React.FC<NewCollectionDialogProps> = ({
  open,
  onOpenChange,
  newCollectionName,
  setNewCollectionName,
  onCreate,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogHeader>
      <DialogTitle>New collection</DialogTitle>
    </DialogHeader>
    <DialogBody>
      <Stack gap="3">
        <Stack gap="2">
          <Label htmlFor="coll-name">Name</Label>
          <Input
            id="coll-name"
            value={newCollectionName}
            onChange={setNewCollectionName}
            placeholder="My collection"
          />
        </Stack>
      </Stack>
    </DialogBody>
    <DialogFooter>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onCreate}>
        Create
      </Button>
    </DialogFooter>
  </Dialog>
);
