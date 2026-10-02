import type React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconAlertCircle } from './icons';
import { Positioned } from './positioned';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

export type FieldBoxState =
  | 'field'
  | 'suggested'
  | 'filled'
  | 'focused'
  | 'error';

export interface FieldBoxProps {
  transform: OverlayTransform;
  box: PageSpaceBox;
  state: FieldBoxState;
  /** Accessible name, e.g. "Text field: Surname, empty". */
  label: string;
  /** Click or Enter: open the inline editor. */
  onActivate(): void;
  onKeyDown?(e: React.KeyboardEvent): void;
  onContextMenu?(e: React.MouseEvent): void;
  /** Suggested fields are not (spec §8.4). */
  inTabOrder: boolean;
  /** The inline editor, rendered in place of the button while editing. */
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

const FRAME: Record<FieldBoxState, string> = {
  field:
    'border-[1.5px] border-accent-fg bg-accent-soft forced-colors:border-[CanvasText]',
  suggested:
    'border-[1.5px] border-dotted border-info bg-info-soft forced-colors:border-[CanvasText]',
  filled: 'border-[1.5px] border-accent-fg forced-colors:border-[CanvasText]',
  focused:
    'border-2 border-focus ring-2 ring-focus forced-colors:border-[Highlight]',
  error:
    'border-[1.5px] border-danger bg-danger-soft forced-colors:border-[CanvasText]',
};

/**
 * A form field on a page (AcroForm widget or detected flat field): a real
 * button sized to its page-space box, outlined by state with tokens only.
 * While editing, `children` (the inline editor) replaces the button.
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
  className,
  'data-testid': testId,
}: FieldBoxProps) {
  const r = mapBox(transform, box);
  return (
    <Positioned
      x={r.left}
      y={r.top}
      width={r.width}
      height={r.height}
      data-state={state}
      data-testid={testId}
      className={cn(
        'pointer-events-auto rounded-sm transition-colors duration-fast',
        FRAME[state],
        className,
      )}
    >
      {children ?? (
        <button
          type="button"
          aria-label={label}
          tabIndex={inTabOrder ? 0 : -1}
          onClick={onActivate}
          onKeyDown={onKeyDown}
          onContextMenu={onContextMenu}
          className="block h-full w-full cursor-text rounded-sm bg-transparent outline-none hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-focus"
        />
      )}
      {state === 'error' && (
        <span className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-surface text-danger">
          <IconAlertCircle size="xs" />
        </span>
      )}
    </Positioned>
  );
}
FieldBox.displayName = 'FieldBox';
