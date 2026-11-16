import { ButtonBase } from '@arshad-shah/cynosure';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Box } from '@/pdf/doc/types';
import type { Matrix } from './layers';

export interface HitAreaProps {
  /** The page's viewport transform (page points to CSS px). */
  transform: Matrix;
  box: Box;
  label: string;
  pressed?: boolean;
  onActivate(): void;
  onKeyDown?(e: KeyboardEvent): void;
  tabIndex?: 0 | -1;
  'data-testid'?: string;
  children?: ReactNode;
}

const map = (t: Matrix, x: number, y: number) =>
  [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f] as const;

/**
 * A transparent button (Cynosure ButtonBase) over a page-space box: the
 * accessible twin of a drawn mark, an annotation or a detected field.
 */
export function HitArea({
  transform: t,
  box,
  label,
  pressed,
  onActivate,
  onKeyDown,
  tabIndex,
  'data-testid': testId,
  children,
}: HitAreaProps) {
  const [x1, y1] = map(t, box.x, box.y);
  const [x2, y2] = map(t, box.x + box.width, box.y + box.height);
  return (
    <ButtonBase
      aria-label={label}
      pressed={pressed}
      tabIndex={tabIndex}
      data-testid={testId}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      style={{
        position: 'absolute',
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        margin: 0,
        padding: 0,
        border: 0,
        borderRadius: 'var(--cy-radius-sm)',
        background: 'transparent',
        cursor: 'pointer',
        pointerEvents: 'auto',
        outline: pressed ? '2px solid var(--cy-color-accent)' : undefined,
      }}
    >
      {children}
    </ButtonBase>
  );
}
