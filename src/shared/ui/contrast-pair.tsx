import { useMemo } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  apcaLc,
  contrastRatio,
  formatColor,
  gamutMap,
  wcagLevels,
} from '@/shared/lib/colour';
import { Badge } from './badge';
import { tryParse } from './color-picker-model';

export interface ContrastPairProps {
  /** Text colour, any CSS colour. */
  fg: string;
  /** Background colour, any CSS colour. */
  bg: string;
  /** Accessible name of the result. */
  label?: string;
  /** Preview text. */
  sample?: string;
  className?: string;
}

/** "4.52:1" with two decimals, never rounding a fail up to a pass. */
const formatRatio = (ratio: number) =>
  `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;

function Level({ name, pass }: { name: string; pass: boolean }) {
  return (
    <Badge tone={pass ? 'success' : 'danger'} variant="soft" size="sm">
      {`${name} ${pass ? 'pass' : 'fail'}`}
    </Badge>
  );
}

/**
 * A text and background pair (ruling R30): a live preview, the WCAG 2.2
 * contrast ratio with AA and AAA results for normal and large text, and the
 * APCA lightness contrast Lc. Results are spelled out, never colour-only.
 */
export function ContrastPair({
  fg,
  bg,
  label = 'Contrast',
  sample = 'The quick brown fox jumps over the lazy dog',
  className,
}: ContrastPairProps) {
  const result = useMemo(() => {
    const f = tryParse(fg);
    const b = tryParse(bg);
    if (!f.color || !b.color)
      return { error: f.error ?? b.error ?? 'Enter two colours' };
    const fc = gamutMap(f.color);
    const bc = gamutMap(b.color);
    const ratio = contrastRatio(fc, bc);
    return {
      fgCss: formatColor(fc, 'rgb'),
      bgCss: formatColor(bc, 'rgb'),
      ratio,
      levels: wcagLevels(ratio),
      lc: apcaLc(fc, bc),
    };
  }, [fg, bg]);

  if ('error' in result)
    return (
      <p role="alert" className={cn('text-sm text-danger', className)}>
        {result.error}
      </p>
    );

  const { ratio, levels, lc } = result;
  return (
    <section
      aria-label={label}
      className={cn(
        'grid gap-3 rounded-lg border border-line bg-surface p-3',
        className,
      )}
    >
      {/*
        The preview shows the pair as it is, failing contrast included, so
        its text is generated content: decorative (aria-hidden), and the
        ratio and levels below are the accessible result. axe would
        otherwise flag the very failure the preview demonstrates.
      */}
      <div
        aria-hidden="true"
        data-contrast-preview=""
        className="rounded-md border border-line-control px-4 py-3"
        style={{ color: result.fgCss, backgroundColor: result.bgCss }}
      >
        <span
          data-sample={sample}
          className="block text-base before:content-[attr(data-sample)]"
        />
        <span
          data-sample={sample}
          className="block text-xl font-bold before:content-[attr(data-sample)]"
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-fg-muted">WCAG ratio</dt>
        <dd className="font-mono text-fg">{formatRatio(ratio)}</dd>
        <dt className="text-fg-muted">APCA</dt>
        <dd className="font-mono text-fg">{`Lc ${lc.toFixed(1)}`}</dd>
      </dl>
      <div className="grid gap-2 text-xs text-fg-muted">
        <div className="flex flex-wrap items-center gap-1">
          <span className="w-20">Normal text</span>
          <Level name="AA" pass={levels.normalAA} />
          <Level name="AAA" pass={levels.normalAAA} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="w-20">Large text</span>
          <Level name="AA" pass={levels.largeAA} />
          <Level name="AAA" pass={levels.largeAAA} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="w-20">UI parts</span>
          <Level name="AA" pass={levels.uiAA} />
        </div>
      </div>
    </section>
  );
}
ContrastPair.displayName = 'ContrastPair';
