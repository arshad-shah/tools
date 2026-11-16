import { useEffect, useState } from 'react';
import { plus, trash } from '@arshad-shah/cynosure/icons';
import {
  Button,
  DateField,
  Dialog,
  Grid,
  IconButton,
  Inline,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="My details"
      description="Stored only on this device and not encrypted."
      actions={
        <>
          <Button
            variant="soft"
            tone="danger"
            disabled={busy}
            onClick={() => void persist(null)}
          >
            Clear my details
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            tone="accent"
            disabled={busy}
            onClick={() => void persist(draft)}
          >
            Save
          </Button>
        </>
      }
    >
      <Stack gap="5">
        <Grid columns={2} minItemWidth="14rem" gap="4">
          {TEXT_KEYS.map((k) => (
            <TextField
              key={k}
              label={DETAIL_LABELS[k]}
              value={draft[k]}
              onChange={(v) => set(k, v)}
            />
          ))}
          <DateField
            label={DETAIL_LABELS.dob}
            value={draft.dob || null}
            onChange={(v) => set('dob', v ?? '')}
          />
        </Grid>
        <Stack gap="3">
          <Text size="sm" weight="medium">
            Custom details
          </Text>
          {draft.custom.map((c, i) => (
            <Inline key={i} gap="2" align="end">
              <TextField
                label="Detail name"
                value={c.key}
                onChange={(v) => setCustom(i, { key: v })}
              />
              <TextField
                label="Value"
                value={c.value}
                onChange={(v) => setCustom(i, { value: v })}
              />
              <IconButton
                label={`Remove custom detail ${i + 1}`}
                icon={trash}
                variant="ghost"
                tone="danger"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    custom: d.custom.filter((_, j) => j !== i),
                  }))
                }
              />
            </Inline>
          ))}
          <Inline>
            <Button
              size="sm"
              variant="outline"
              icon={plus}
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
          </Inline>
        </Stack>
      </Stack>
    </Dialog>
  );
}
