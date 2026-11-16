import { Button, Dialog, TextField } from '@arshad-shah/cynosure';
import React from 'react';

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newCollectionName: string;
  setNewCollectionName: (name: string) => void;
  onCreate: () => void;
}

/** Name a new collection (Enter creates it). */
export const NewCollectionDialog: React.FC<NewCollectionDialogProps> = ({
  open,
  onOpenChange,
  newCollectionName,
  setNewCollectionName,
  onCreate,
}) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title="New collection"
    actions={
      <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="solid"
          disabled={!newCollectionName.trim()}
          onClick={onCreate}
        >
          Create
        </Button>
      </>
    }
  >
    <TextField
      label="Name"
      value={newCollectionName}
      onChange={setNewCollectionName}
      placeholder="My collection"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCreate();
        }
      }}
    />
  </Dialog>
);
