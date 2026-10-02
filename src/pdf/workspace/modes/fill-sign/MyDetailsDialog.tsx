import { useEffect, useState } from 'react';
import { IconPlus, IconTrash } from '@/shared/ui/icons';
import {
  Button,
  DateInput,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  Text,
} from '@/shared/ui';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import type { AutofillKey } from '@/pdf/detect';
import {
  clearMyDetails,
  DETAIL_LABELS,
  EMPTY_DETAILS,
  loadMyDetails,
  MAX_CUSTOM,
  saveMyDetails,
  type MyDetails,
} from '@/pdf/doc/profile';
import { getWorkspaceDb } from '../../workspace-db';

const TEXT_KEYS = (Object.keys(DETAIL_LABELS) as AutofillKey[]).filter(
  (k) => k !== 'dob',
);

/** "My details" (spec §8.6): edited here, stored only on this device. */
export function MyDetailsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onSaved?(details: MyDetails | null): void;
}) {
  const [draft, setDraft] = useState<MyDetails>(EMPTY_DETAILS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void getWorkspaceDb()
      .then((db) => (db ? loadMyDetails(db) : null))
      .then((d) => live && setDraft(d ?? EMPTY_DETAILS))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);

  const set = (k: AutofillKey, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const setCustom = (i: number, patch: Partial<MyDetails['custom'][number]>) =>
    setDraft((d) => ({
      ...d,
      custom: d.custom.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    }));

  const persist = async (next: MyDetails | null) => {
    setBusy(true);
    try {
      const db = await getWorkspaceDb();
      if (!db) throw new Error('This browser has no local storage');
      if (next) await saveMyDetails(db, next);
      else await clearMyDetails(db);
      notify.success(next ? 'My details saved' : 'My details cleared');
      onSaved?.(next);
      onOpenChange(false);
    } catch (e) {
      notify.error(toToolError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogHeader>
        <DialogTitle>My details</DialogTitle>
        <DialogDescription>
          Stored only on this device and not encrypted.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {TEXT_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <Label htmlFor={`my-${k}`}>{DETAIL_LABELS[k]}</Label>
              <Input
                id={`my-${k}`}
                value={draft[k]}
                onChange={(v) => set(k, v)}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <Label htmlFor="my-dob">{DETAIL_LABELS.dob}</Label>
            <DateInput
              id="my-dob"
              label={DETAIL_LABELS.dob}
              value={draft.dob}
              onChange={(v) => set('dob', v)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Text size="sm" weight="medium">
            Custom details
          </Text>
          {draft.custom.map((c, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor={`my-custom-key-${i}`}>Detail name</Label>
                <Input
                  id={`my-custom-key-${i}`}
                  value={c.key}
                  onChange={(v) => setCustom(i, { key: v })}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor={`my-custom-value-${i}`}>Value</Label>
                <Input
                  id={`my-custom-value-${i}`}
                  value={c.value}
                  onChange={(v) => setCustom(i, { value: v })}
                />
              </div>
              <IconButton
                label={`Remove custom detail ${i + 1}`}
                icon={IconTrash}
                variant="ghost"
                tone="danger"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    custom: d.custom.filter((_, j) => j !== i),
                  }))
                }
              />
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconPlus size="sm" />}
              disabled={draft.custom.length >= MAX_CUSTOM}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  custom: [...d.custom, { key: '', value: '' }],
                }))
              }
            >
              Add custom detail
            </Button>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => void persist(null)}
        >
          Clear my details
        </Button>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void persist(draft)}
        >
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
