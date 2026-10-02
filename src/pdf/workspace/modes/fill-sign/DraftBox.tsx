import { FieldBox, type OverlayTransform } from '@/shared/ui';
import type { PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { placeFree } from './actions';
import { FieldEditor } from './FieldEditor';
import { FieldValue } from './FieldValue';
import { fieldName, type ViewField } from './fields';
import { fillSign, useFillSign } from './store';
import { remember } from './text-style';

/** The key of the click-anywhere box being typed (not in the document yet). */
export const DRAFT_KEY = 'draft';

/** A new text or date box being typed: committed as a free fill on Enter. */
export function DraftBox({
  ctx,
  page,
  pageNumber,
  transform,
  quarter,
}: {
  ctx: ModeProps;
  page: PageRef;
  pageNumber: number;
  transform: OverlayTransform;
  quarter: boolean;
}) {
  const draft = useFillSign((s) =>
    s.draft?.pageId === page.id ? s.draft : null,
  );
  const typing = useFillSign((s) =>
    s.typing?.key === DRAFT_KEY ? s.typing.value : '',
  );
  if (!draft) return null;
  const field: ViewField = {
    key: DRAFT_KEY,
    page,
    pageNumber,
    rect: draft.rect,
    type: draft.kind,
    label: draft.kind === 'date' ? 'Date' : 'Text',
    autofill: null,
    status: 'field',
    origin: 'free',
    value: '',
    filled: false,
    fillOpId: null,
    style: draft.style,
  };
  const commit = (v: string) => {
    fillSign.set({ draft: null, typing: null });
    if (!v.trim()) return;
    const placed = placeFree(
      ctx,
      page.id,
      draft.rect,
      draft.kind,
      v,
      draft.style,
    );
    if (!placed) return;
    remember(ctx.doc.state.id, draft.style);
    ctx.selection.selectObjects([placed.opId]);
  };
  return (
    <>
      <FieldValue
        field={field}
        value={typing}
        settings={draft.style}
        transform={transform}
        quarter={quarter}
      />
      <FieldBox
        transform={transform}
        box={draft.rect}
        state="focused"
        label={fieldName(field)}
        inTabOrder
        onActivate={() => {}}
      >
        <FieldEditor
          field={field}
          onDraft={(v) =>
            fillSign.set({ typing: { key: DRAFT_KEY, value: v } })
          }
          onSettings={() =>
            fillSign.set({ barFocus: fillSign.get().barFocus + 1 })
          }
          onCommit={commit}
          onCancel={() => fillSign.set({ draft: null, typing: null })}
          onTab={(v) => commit(v)}
        />
      </FieldBox>
    </>
  );
}
