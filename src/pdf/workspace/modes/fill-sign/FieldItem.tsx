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
import { advance, commitValue, resizeField } from './actions';
import { FieldEditor } from './FieldEditor';
import { FieldValue } from './FieldValue';
import { fieldName, type ViewField } from './fields';
import { FocusOnMount } from './FocusOnMount';
import { fillSign, useFillSign } from './store';

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
  onActivate(): void;
  onKeyDown(e: React.KeyboardEvent): void;
  onContextMenu?(e: React.MouseEvent): void;
}

/**
 * One field on the page: its value as it will export, then the control for
 * its state: a FieldBox (with the inline editor while editing), resize
 * handles while resizing, or, for a selected free text box, a move and
 * resize frame (double-click or Edit text to type, Delete to remove).
 */
export function FieldItem({
  ctx,
  field: x,
  all,
  transform,
  quarter,
  snap,
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
  const [preview, setPreview] = useState<Box | null>(null);
  const selected =
    x.origin === 'free' &&
    !!x.fillOpId &&
    ctx.selection.objects.has(x.fillOpId);
  const name = fieldName(x);
  const value = (
    <FieldValue
      field={{ ...x, rect: preview ?? x.rect }}
      value={typing ?? x.value}
      settings={styling ?? undefined}
      transform={transform}
      quarter={quarter}
    />
  );

  if (resizing || (selected && !editing))
    return (
      <>
        {value}
        <FocusOnMount
          active
          onLeave={
            resizing ? () => fillSign.set({ resizing: null }) : undefined
          }
        >
          <div
            onDoubleClick={() => selected && fillSign.set({ editing: x.key })}
            onKeyDown={(e) => {
              if (e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                fillSign.set({ barFocus: fillSign.get().barFocus + 1 });
              }
            }}
          >
            <SelectionFrame
              transform={transform}
              box={preview ?? x.rect}
              resizable
              snap={resizing ? snap : undefined}
              label={resizing ? `Resize ${name}` : name}
              onChange={setPreview}
              onCommit={(box) => {
                setPreview(null);
                if (resizing) resizeField(ctx, x, box);
                else if (x.fillOpId) {
                  const ops = ctx.doc.dispatch({
                    type: 'object.move',
                    params: { targetId: x.fillOpId, rect: box },
                  });
                  if (ops.length) ctx.selection.selectObjects([x.fillOpId]);
                }
              }}
            />
          </div>
        </FocusOnMount>
      </>
    );

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
            onDraft={(v) => fillSign.set({ typing: { key: x.key, value: v } })}
            onSettings={() =>
              fillSign.set({ barFocus: fillSign.get().barFocus + 1 })
            }
            onCommit={(v) => {
              fillSign.set({ typing: null });
              if (commitValue(ctx, x, v)) advance(ctx, all, x.key);
            }}
            onCancel={() => fillSign.set({ editing: null, typing: null })}
            onTab={(v, dir) => {
              fillSign.set({ typing: null });
              if (commitValue(ctx, x, v)) advance(ctx, all, x.key, dir);
            }}
          />
        ) : undefined}
      </FieldBox>
    </>
  );
}
