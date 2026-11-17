import { Button, Dialog, Form, Select, TextField } from '@arshad-shah/cynosure';
import React from 'react';
import type { Folder } from '../lib/collections-migrate';

interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveName: string;
  setSaveName: (name: string) => void;
  selectedCollectionId: string;
  setSelectedCollectionId: (id: string) => void;
  collections: Folder[];
  onSave: () => void;
}

/** Name the request and pick its collection (Enter in the name saves). */
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
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title="Save request"
    actions={
      <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="solid" onClick={onSave}>
          Save
        </Button>
      </>
    }
  >
    <Form label="Save request" gap="4" onSubmit={onSave}>
      <TextField
        label="Name"
        value={saveName}
        onChange={setSaveName}
        placeholder="My request"
      />
      <Select
        label="Collection"
        value={selectedCollectionId}
        onChange={setSelectedCollectionId}
        options={[
          { value: '', label: 'Select a collection' },
          ...collections.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
    </Form>
  </Dialog>
);
