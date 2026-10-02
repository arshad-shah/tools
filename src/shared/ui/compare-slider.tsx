import React, { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { IconGripVertical } from '@/shared/ui/icons';
import { Image } from './image';

/** An image as a URL string, a Blob, or bytes with their MIME type. */
export type CompareImageSource =
  | { src: string; mime?: undefined }
  | { src: Blob; mime?: undefined }
  | { src: Uint8Array; mime: string };

export interface CompareSliderProps {
  before: CompareImageSource;
  after: CompareImageSource;
  /** Names of the two images, shown on them and used as their alt text. */
  labels?: [string, string];
  /** Divider position, 0 (all after) to 1 (all before). */
  initial?: number;
  /** fit: both images scaled into the box. 1:1: actual pixels, panned together. */
  zoom?: 'fit' | '1:1';
  /** Accessible name of the whole control. */
  label?: string;
  className?: string;
}

const PAN_STEP = 40;

function Pic({
  source,
  alt,
  className,
  onLoad,
}: {
  source: CompareImageSource;
  alt: string;
  className?: string;
  onLoad?(e: React.SyntheticEvent<HTMLImageElement>): void;
}) {
  const common = { alt, className, onLoad, draggable: false };
  if (source.src instanceof Uint8Array)
    return <Image {...common} src={source.src} mime={source.mime ?? ''} />;
  if (typeof source.src === 'string')
    return <Image {...common} src={source.src} />;
  return <Image {...common} src={source.src} />;
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

/**
 * Before and after comparison: the before image is revealed left of a
 * divider that is a slider (arrows move 1 percent, Shift 10). In 1:1 mode
 * a drag (or the arrows on the focused image box) pans both images
 * together.
 */
export function CompareSlider({
  before,
  after,
  labels = ['Before', 'After'],
  initial = 0.5,
  zoom = 'fit',
  label = 'Comparison',
  className,
}: CompareSliderProps) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => clampPct(initial * 100));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<
    | { kind: 'divider' }
    | { kind: 'pan'; x: number; y: number; px: number; py: number }
    | null
  >(null);
  const actual = zoom === '1:1';

  const clampPan = (p: { x: number; y: number }) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !natural) return p;
    return {
      x: Math.min(0, Math.max(Math.min(0, r.width - natural.w), p.x)),
      y: Math.min(0, Math.max(Math.min(0, r.height - natural.h), p.y)),
    };
  };

  const posFromPointer = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(clampPct(((clientX - r.left) / r.width) * 100));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const onDivider = (e.target as HTMLElement).closest('[data-divider]');
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (actual && !onDivider) {
      drag.current = {
        kind: 'pan',
        x: e.clientX,
        y: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      return;
    }
    drag.current = { kind: 'divider' };
    posFromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'divider') posFromPointer(e.clientX);
    else
      setPan(
        clampPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }),
      );
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onDividerKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const next =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? pos - step
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? pos + step
          : e.key === 'PageDown'
            ? pos - 10
            : e.key === 'PageUp'
              ? pos + 10
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? 100
                  : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    setPos(clampPct(Math.round(next)));
  };

  const onPanKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!actual || e.target !== e.currentTarget) return;
    const d = {
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    setPan((p) => clampPan({ x: p.x + d[0], y: p.y + d[1] }));
  };

  const imgClass = actual
    ? 'absolute left-0 top-0 max-w-none'
    : 'size-full object-contain';
  const shift = actual
    ? { transform: `translate(${pan.x}px, ${pan.y}px)` }
    : undefined;
  const rounded = Math.round(pos);

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      aria-roledescription={actual ? 'pannable image comparison' : undefined}
      tabIndex={actual ? 0 : undefined}
      onKeyDown={onPanKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        'relative w-full touch-none select-none overflow-hidden rounded-md border border-line bg-surface-2',
        actual ? 'h-96 cursor-grab' : 'aspect-video cursor-ew-resize',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
    >
      <div className="absolute inset-0" style={shift}>
        <Pic
          source={after}
          alt={labels[1]}
          className={imgClass}
          onLoad={(e) =>
            setNatural({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <div className="absolute inset-0" style={shift}>
          <Pic source={before} alt={labels[0]} className={imgClass} />
        </div>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-sm bg-surface px-1.5 py-0.5 text-xs text-fg shadow-e1">
        {labels[0]}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-sm bg-surface px-1.5 py-0.5 text-xs text-fg shadow-e1">
        {labels[1]}
      </span>
      <div
        data-divider=""
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 cursor-ew-resize bg-surface shadow-e1"
        style={{ left: `${pos}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Divider"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-valuetext={`Showing ${rounded} percent ${labels[0].toLowerCase()}`}
          onKeyDown={onDividerKey}
          className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-control bg-surface text-fg shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <IconGripVertical size="sm" />
        </div>
      </div>
    </div>
  );
}
CompareSlider.displayName = 'CompareSlider';
