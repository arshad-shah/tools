import { cn } from '@/shared/lib/cn';
import { IconAlertCircle, IconAlertTriangle, IconInfo } from '../icons';
import { Tooltip } from '../tooltip';
import { mostSevere, SEVERITY_WORD } from './decor';
import type { CodeMarker, MarkerSeverity } from './types';

const ICON = {
  error: IconAlertCircle,
  warning: IconAlertTriangle,
  info: IconInfo,
} as const;

const TONE: Record<MarkerSeverity, string> = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

/**
 * The gutter cell of one line: its number (hidden from assistive tech; the
 * textbox already exposes the text) and the icon of its most severe marker,
 * labelled and described by a tooltip with every message on the line.
 */
export function GutterCell({
  line,
  markers,
  showNumber,
  label,
}: {
  line: number;
  markers: readonly CodeMarker[] | undefined;
  showNumber: boolean;
  /** Shown instead of the line number when given; null is blank. */
  label?: number | string | null;
}) {
  const top = markers?.length ? mostSevere(markers) : undefined;
  const Icon = top ? ICON[top.severity] : null;
  return (
    <>
      <span className="flex w-4 shrink-0 items-center justify-center">
        {top && Icon ? (
          <Tooltip
            side="bottom"
            content={markers!.map((m) => m.message).join('. ')}
          >
            <span
              role="img"
              aria-label={`${SEVERITY_WORD[top.severity]} on line ${line}`}
              className={cn('inline-flex cursor-default', TONE[top.severity])}
            >
              <Icon size="xs" />
            </span>
          </Tooltip>
        ) : null}
      </span>
      {showNumber ? (
        <span aria-hidden="true" className="flex-1 text-right">
          {label === undefined ? line : (label ?? '')}
        </span>
      ) : null}
    </>
  );
}
