import { useRef, useState } from 'react';
import { FieldBox, SelectionFrame, type OverlayTransform } from '@/shared/ui';
import type { Box, PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { placeFree } from './actions';
import { FieldEditor } from './FieldEditor';
import { FieldValue } from './FieldValue';
import { fieldName, type ViewField } from './fields';
import { fillSign, useFillSign } from './store';
import { caretMetrics, remember } from './text-style';

/** The key of the click-anywhere box being typed (not in the document yet). */
export const DRAFT_KEY = 'draft';

/**
 * A new text or date box being typed: committed as a free fill on Enter.
 * Its selection frame resizes or moves the box while it is typed; the
 * caret goes back to the text after each change.
 */
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
  const finish = useFillSign((s) => s.finish);
  const [preview, setPreview] = useState<Box | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  if (!draft) return null;
  const rect = preview ?? draft.rect;
  const field: ViewField = {
    key: DRAFT_KEY,
    page,
    pageNumber,
    rect,
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
  const backToText = () =>
    editor.current
      ?.querySelector<HTMLElement>('input, textarea, select')
      ?.focus({ preventScroll: true });
  return (
    <>
      <FieldValue
        field={field}
        value={typing}
        settings={draft.style}
        transform={transform}
        quarter={quarter}
      />
      <SelectionFrame
        transform={transform}
        box={rect}
        resizable
        label={`Resize new ${draft.kind === 'date' ? 'date' : 'text'} box`}
        onChange={setPreview}
        onCommit={(box) => {
          setPreview(null);
          const cur = fillSign.get().draft;
          if (cur) fillSign.set({ draft: { ...cur, rect: box } });
          backToText();
        }}
      />
      <div ref={editor} className="contents">
        <FieldBox
          transform={transform}
          box={rect}
          state="focused"
          label={fieldName(field)}
          inTabOrder
          onActivate={() => {}}
        >
          <FieldEditor
            field={field}
            inline={
              draft.kind === 'text'
                ? caretMetrics(
                    typing,
                    rect,
                    draft.style,
                    Math.hypot(transform.a, transform.b) || 1,
                    quarter,
                  )
                : undefined
            }
            escapeKeeps
            finishNonce={finish}
            onFinish={(v) => {
              // Done: keep the text, close the editor and the bar.
              commit(v);
              ctx.selection.clear();
            }}
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
      </div>
    </>
  );
}
