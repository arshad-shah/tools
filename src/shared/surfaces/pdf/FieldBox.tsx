import { ButtonBase, Icon } from '@arshad-shah/cynosure';
import { alertCircle } from '@arshad-shah/cynosure/icons';
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import type { Box } from '@/pdf/doc/types';
import { boxRect } from './geometry';
import type { Matrix } from './layers';

export type FieldBoxState =
  | 'field'
  | 'suggested'
  | 'filled'
  | 'focused'
  | 'error';

/** A field's frame on the page, by state, in the theme's colours. */
const LOOK: Record<FieldBoxState, CSSProperties> = {
  field: {
    border: '1.5px solid var(--cy-color-accent)',
    background: 'color-mix(in oklab, var(--cy-color-accent) 14%, transparent)',
  },
  suggested: {
    border: '1.5px dotted var(--cy-color-info)',
    background: 'color-mix(in oklab, var(--cy-color-info) 14%, transparent)',
  },
  filled: { border: '1.5px solid var(--cy-color-accent)' },
  // The box being typed in: a thin outline (the page shows through), above
  // any object layer so it takes the caret.
  focused: {
    zIndex: 10,
    outline: '1.5px solid var(--cy-color-accent)',
  },
  error: {
    border: '1.5px solid var(--cy-color-danger)',
    background: 'color-mix(in oklab, var(--cy-color-danger) 14%, transparent)',
  },
};

/**
 * A form field drawn on the page: its frame by state, and a transparent
 * button (Cynosure ButtonBase) over it that opens it, or the editor in it.
 */
export function FieldBox({
  transform,
  box,
  state,
  label,
  onActivate,
  onKeyDown,
  onContextMenu,
  inTabOrder,
  children,
  'data-testid': testId,
}: {
  transform: Matrix;
  box: Box;
  state: FieldBoxState;
  label: string;
  onActivate(): void;
  onKeyDown?(e: KeyboardEvent): void;
  onContextMenu?(e: MouseEvent): void;
  inTabOrder: boolean;
  children?: ReactNode;
  'data-testid'?: string;
}) {
  const r = boxRect(transform, box);
  return (
    <div
      data-state={state}
      data-testid={testId}
      style={{
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.width,
        height: r.height,
        boxSizing: 'border-box',
        borderRadius: 'var(--cy-radius-sm)',
        pointerEvents: 'auto',
        ...LOOK[state],
      }}
    >
      {children ?? (
        <ButtonBase
          aria-label={label}
          tabIndex={inTabOrder ? 0 : -1}
          onClick={onActivate}
          onKeyDown={onKeyDown}
          onContextMenu={onContextMenu}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'text',
          }}
        />
      )}
      {state === 'error' ? (
        <span
          style={{ position: 'absolute', top: -8, right: -8, display: 'flex' }}
        >
          <Icon icon={alertCircle} size="sm" tone="danger" />
        </span>
      ) : null}
    </div>
  );
}
