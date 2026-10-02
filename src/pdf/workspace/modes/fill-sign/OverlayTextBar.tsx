import { useEffect, useRef } from 'react';
import type { OverlayTransform } from '@/shared/ui';
import type { PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { boxAnchor } from './anchor';
import { restyle } from './actions';
import { DRAFT_KEY } from './DraftBox';
import type { ViewField } from './fields';
import { fillSign, useFillSign } from './store';
import { effectiveStyle, type FieldStyle } from './text-style';
import { TextStyleBar } from './TextStyleBar';

/** Flat text a user can style: detected or free text and dates, not widgets. */
const styleable = (f: ViewField) =>
  f.origin !== 'widget' &&
  (f.type === 'text' || f.type === 'date' || f.type === 'multiline');

/**
 * The text settings bar for this page's active text: the field being edited,
 * the selected free text box, or the box being typed (plan R39). Settled
 * changes are one "Change text style" step; drafts change in place.
 */
export function OverlayTextBar({
  ctx,
  page,
  fields,
  transform,
  quarter,
  root,
}: {
  ctx: ModeProps;
  page: PageRef;
  fields: readonly ViewField[];
  transform: OverlayTransform;
  quarter: boolean;
  root: () => HTMLElement | null;
}) {
  const editing = useFillSign((s) => s.editing);
  const draft = useFillSign((s) =>
    s.draft?.pageId === page.id ? s.draft : null,
  );
  const barClosed = useFillSign((s) => s.barClosed);
  const barFocus = useFillSign((s) => s.barFocus);
  const finish = () => fillSign.set({ finish: fillSign.get().finish + 1 });
  // Settled changes land after a delay: they use the field as it is then.
  const latest = useRef<{ ctx: ModeProps; fields: readonly ViewField[] }>({
    ctx,
    fields,
  });
  useEffect(() => {
    latest.current = { ctx, fields };
  }, [ctx, fields]);

  if (draft) {
    if (barClosed === DRAFT_KEY) return null;
    const setDraft = (style: FieldStyle) =>
      fillSign.set({ draft: { ...draft, style } });
    return (
      <TextStyleBar
        anchor={boxAnchor(root, transform, draft.rect)}
        settings={draft.style}
        multiline={false}
        layout={ctx.layout}
        focusNonce={barFocus}
        onPreview={setDraft}
        onChange={setDraft}
        onClose={() => fillSign.set({ barClosed: DRAFT_KEY })}
        onDone={finish}
        scrollRoot={root}
        boxKey={DRAFT_KEY}
      />
    );
  }

  const active = fields.find(
    (f) =>
      styleable(f) &&
      (f.key === editing ||
        (f.origin === 'free' &&
          !!f.fillOpId &&
          ctx.selection.objects.has(f.fillOpId))),
  );
  if (!active || barClosed === active.key) return null;
  const free = active.origin === 'free' && active.key !== editing;
  return (
    <TextStyleBar
      anchor={boxAnchor(root, transform, active.rect)}
      settings={effectiveStyle(active, quarter)}
      multiline={active.type === 'multiline'}
      layout={ctx.layout}
      scrollRoot={root}
      boxKey={active.key}
      focusNonce={barFocus}
      onPreview={(style) =>
        fillSign.set({ styling: { key: active.key, style } })
      }
      onChange={(style) => {
        fillSign.set({ styling: null });
        const now = latest.current;
        const field = now.fields.find((f) => f.key === active.key);
        if (!field) return;
        const opId = restyle(now.ctx, field, style);
        if (
          opId &&
          field.origin === 'free' &&
          field.key !== fillSign.get().editing
        )
          now.ctx.selection.selectObjects([opId]);
      }}
      onClose={() => fillSign.set({ barClosed: active.key, styling: null })}
      onDone={() => {
        if (active.key === editing) finish();
        else ctx.selection.clear();
      }}
      onEditText={
        free ? () => fillSign.set({ editing: active.key }) : undefined
      }
      onDelete={
        free && active.fillOpId
          ? () => {
              const ops = ctx.doc.dispatch({
                type: 'object.remove',
                params: { targetId: active.fillOpId },
              });
              if (ops.length) ctx.selection.clear();
            }
          : undefined
      }
    />
  );
}
