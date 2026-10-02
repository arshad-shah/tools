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
  Select,
  Stack,
} from '@/shared/ui';
import type { CollectionType } from '../types';

interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveName: string;
  setSaveName: (name: string) => void;
  selectedCollectionId: string;
  setSelectedCollectionId: (id: string) => void;
  collections: CollectionType[];
  onSave: () => void;
}

export const SaveRequestDialog: React.FC<SaveRequestDialogProps> = ({
  open,
  onOpenChange,
  saveName,
  setSaveName,
  selectedCollectionId,
  setSelectedCollectionId,
  collections,
  onSave,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogHeader>
      <DialogTitle>Save request</DialogTitle>
    </DialogHeader>
    <DialogBody>
      <Stack gap="3">
        <Stack gap="2">
          <Label htmlFor="save-name">Name</Label>
          <Input
            id="save-name"
            value={saveName}
            onChange={setSaveName}
            placeholder="My request"
          />
        </Stack>
        <Stack gap="2">
          <Label>Collection</Label>
          <Select
            value={selectedCollectionId}
            onValueChange={setSelectedCollectionId}
            items={[
              { value: '', label: 'Select a collection' },
              ...collections.map((c) => ({ value: c.id, label: c.name })),
            ]}
            aria-label="Collection"
          />
        </Stack>
      </Stack>
    </DialogBody>
    <DialogFooter>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSave}>
        Save
      </Button>
    </DialogFooter>
  </Dialog>
);
