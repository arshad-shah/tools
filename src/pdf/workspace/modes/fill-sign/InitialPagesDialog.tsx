import { useId, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Inline,
  Label,
  RadioGroup,
  Stack,
  Text,
} from '@/shared/ui';
import { newId } from '@/shared/lib/id';
import { PageRangeField } from '@/pdf/components';
import { trySelectPages } from '@/pdf/edit';
import type {
  PageAnchor,
  SignatureContent,
  SignInitialPagesParams,
} from '@/pdf/doc/ops/fill-sign';
import type { NewOperation, Operation, PageId } from '@/pdf/doc/types';

type Which = 'every' | 'chosen';

export interface InitialPagesDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The document's pages, in order. */
  pageIds: readonly PageId[];
  /** The initials to put down (null: make them first). */
  content: SignatureContent | null;
  /** The selected initials' spot, when some are selected. */
  selectedAnchor: PageAnchor | null;
  /** Where the initials go otherwise. */
  defaultAnchor: PageAnchor;
  dispatch(op: NewOperation): Operation[];
}

const plural = (n: number) => `${n} ${n === 1 ? 'page' : 'pages'}`;

/**
 * "Initial pages" (plan H-14): the initials at the same spot on every page
 * or on chosen pages, as one step.
 */
export function InitialPagesDialog({
  open,
  onOpenChange,
  pageIds,
  content,
  selectedAnchor,
  defaultAnchor,
  dispatch,
}: InitialPagesDialogProps) {
  const id = useId();
  const [which, setWhich] = useState<Which>('every');
  const [ranges, setRanges] = useState('');
  const [sameSpot, setSameSpot] = useState(true);
  const picked = useMemo(
    () =>
      trySelectPages(
        which === 'every' ? { mode: 'all' } : { mode: 'ranges', text: ranges },
        pageIds.length,
      ),
    [which, ranges, pageIds.length],
  );
  const ids = picked.pages.map((i) => pageIds[i]).filter(Boolean);
  const useSelected = sameSpot && selectedAnchor !== null;
  const anchor = useSelected ? selectedAnchor : defaultAnchor;

  const apply = () => {
    if (!content || ids.length === 0) return;
    const params: SignInitialPagesParams = {
      id: newId(),
      pageIds: ids,
      anchor,
      content,
    };
    if (dispatch({ type: 'sign.initialPages', params }).length)
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Initial pages</DialogTitle>
        <DialogDescription>
          Puts your initials at the same spot on each page.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Stack gap="4">
          <RadioGroup
            label="Pages to initial"
            heading={<Label>Pages to initial</Label>}
            value={which}
            onValueChange={(v) => setWhich(v as Which)}
            options={[
              { value: 'every', label: 'Every page' },
              { value: 'chosen', label: 'Chosen pages' },
            ]}
          />
          {which === 'chosen' ? (
            <PageRangeField
              id={`${id}-initial`}
              mode="ranges"
              text={ranges}
              onModeChange={() => {}}
              onTextChange={setRanges}
              error={picked.error}
              rangesOnly
            />
          ) : null}
          <Stack gap="1">
            <Inline gap="2">
              <Checkbox
                id={`${id}-spot`}
                checked={useSelected}
                disabled={selectedAnchor === null}
                onCheckedChange={setSameSpot}
              />
              <Label htmlFor={`${id}-spot`}>
                Same spot as the selected initials
              </Label>
            </Inline>
            {useSelected ? null : (
              <Text size="sm" tone="muted">
                {selectedAnchor === null
                  ? 'No initials are selected, so they go in the bottom-right corner of each page.'
                  : 'They go in the bottom-right corner of each page.'}
              </Text>
            )}
          </Stack>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!content || ids.length === 0}
          onClick={apply}
        >
          {`Initial ${plural(ids.length)}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
