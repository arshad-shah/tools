import { useState } from 'react';
import type React from 'react';
import {
  FieldBox,
  SelectionFrame,
  type FieldBoxState,
  type OverlayTransform,
} from '@/shared/ui';
import type { Box } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { advance, resizeField, writeValue } from './actions';
import { FieldEditor } from './FieldEditor';
import { FieldValue } from './FieldValue';
import { fieldName, type ViewField } from './fields';
import { FocusOnMount } from './FocusOnMount';
import { fillSign, useFillSign } from './store';
import { caretMetrics, effectiveStyle } from './text-style';

const stateOf = (f: ViewField, editing: boolean): FieldBoxState =>
  editing
    ? 'focused'
    : f.status === 'suggested'
      ? 'suggested'
      : f.filled
        ? 'filled'
        : 'field';

export interface FieldItemProps {
  ctx: ModeProps;
  field: ViewField;
  /** Every field of the document (Tab order). */
  all: readonly ViewField[];
  transform: OverlayTransform;
  quarter: boolean;
  snap(box: Box): Box;
  /** A free box being dragged or resized on the object layer. */
  livePreview?: Box;
  onActivate(): void;
  onKeyDown(e: React.KeyboardEvent): void;
  onContextMenu?(e: React.MouseEvent): void;
}

/**
 * One field on the page: its value as it will export, then the control for
 * its state: a FieldBox (with the inline editor while editing) or resize
 * handles while resizing. Free boxes are placed objects: the page's object
 * layer moves, resizes and deletes them; here they only show their value
 * and, while editing, the editor.
 */
export function FieldItem({
  ctx,
  field: x,
  all,
  transform,
  quarter,
  snap,
  livePreview,
  onActivate,
  onKeyDown,
  onContextMenu,
}: FieldItemProps) {
  const editing = useFillSign((s) => s.editing === x.key);
  const resizing = useFillSign((s) => s.resizing === x.key);
  const typing = useFillSign((s) =>
    s.typing?.key === x.key ? s.typing.value : null,
  );
  const styling = useFillSign((s) =>
    s.styling?.key === x.key ? s.styling.style : null,
  );
  const finish = useFillSign((s) => s.finish);
  const [preview, setPreview] = useState<Box | null>(null);
  const name = fieldName(x);
  const value = (
    <FieldValue
      field={{ ...x, rect: livePreview ?? preview ?? x.rect }}
      value={typing ?? x.value}
      settings={styling ?? undefined}
      transform={transform}
      quarter={quarter}
    />
  );

  if (resizing)
    return (
      <>
        {value}
        <FocusOnMount active onLeave={() => fillSign.set({ resizing: null })}>
          <SelectionFrame
            transform={transform}
            box={preview ?? x.rect}
            resizable
            snap={snap}
            label={`Resize ${name}`}
            onChange={setPreview}
            onCommit={(box) => {
              setPreview(null);
              resizeField(ctx, x, box);
            }}
          />
        </FocusOnMount>
      </>
    );

  if (x.origin === 'free' && !editing) return value;

  return (
    <>
      {value}
      <FieldBox
        transform={transform}
        box={x.rect}
        state={stateOf(x, editing)}
        label={name}
        inTabOrder={x.status === 'field'}
        onActivate={onActivate}
        onKeyDown={onKeyDown}
        onContextMenu={onContextMenu}
        data-testid={`field-${x.key}`}
      >
        {editing ? (
          <FieldEditor
            field={x}
            inline={
              x.type === 'text'
                ? caretMetrics(
                    typing ?? x.value,
                    x.rect,
                    styling ?? effectiveStyle(x, quarter),
                    Math.hypot(transform.a, transform.b) || 1,
                    quarter,
                  )
                : undefined
            }
            escapeKeeps={x.origin === 'free'}
            finishNonce={finish}
            onFinish={(v) => {
              // Done: keep the text, close the editor and the bar.
              fillSign.set({ typing: null, editing: null });
              writeValue(ctx, x, v);
              ctx.selection.clear();
            }}
            onDraft={(v) => fillSign.set({ typing: { key: x.key, value: v } })}
            onSettings={() =>
              fillSign.set({ barFocus: fillSign.get().barFocus + 1 })
            }
            onCommit={(v) => {
              fillSign.set({ typing: null });
              const done = writeValue(ctx, x, v);
              if (!done.ok) return;
              if (x.origin === 'free') {
                // Back to the placed box, selected for moving or styling.
                fillSign.set({ editing: null });
                const id = done.opId ?? x.fillOpId;
                if (id && v !== '') ctx.selection.selectObjects([id]);
              } else advance(ctx, all, x.key);
            }}
            onCancel={() => fillSign.set({ editing: null, typing: null })}
            onTab={(v, dir) => {
              fillSign.set({ typing: null });
              if (writeValue(ctx, x, v).ok) advance(ctx, all, x.key, dir);
            }}
          />
        ) : undefined}
      </FieldBox>
    </>
  );
}
