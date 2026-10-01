import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/ui';
import { cn } from '@/lib/utils';
import { usePageBitmap, type PageInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';

const rotationClass: Record<Rotation, string> = {
  0: '',
  90: 'rotate-90',
  180: 'rotate-180',
  270: '-rotate-90',
};

interface PageThumbProps {
  docId: string;
  pageIndex: number;
  page: PageInfo;
  /** CSS px. */
  width: number;
  /** Extra rotation previewed on top of the page's own. */
  rotation?: Rotation;
  label: string;
}

/** Renders only once scrolled near the viewport; keeps pixels after the cache evicts. */
export const PageThumb: React.FC<PageThumbProps> = ({
  docId,
  pageIndex,
  page,
  width,
  rotation = 0,
  label,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  // Which page/width the canvas currently shows. Kept when the hook later
  // returns null (cache eviction) so the drawn pixels stay on screen.
  const [drawnKey, setDrawnKey] = useState<string | null>(null);
  const pixelWidth = Math.round(width * (window.devicePixelRatio || 1));
  const { bitmap, error } = usePageBitmap(
    docId,
    pageIndex,
    pixelWidth,
    visible,
  );
  const key = `${docId}:${pageIndex}:${pixelWidth}`;
  const drawable = bitmap !== null && bitmap.width > 0;
  // Adjust state during render; the effect below draws this bitmap on commit.
  if (drawable && drawnKey !== key) setDrawnKey(key);
  const hasDrawn = drawable || drawnKey === key;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !bitmap || bitmap.width === 0) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  return (
    <div
      ref={box}
      className="flex items-center justify-center overflow-hidden"
      style={{
        width,
        height:
          width * Math.max(page.height / page.width, page.width / page.height),
      }}
    >
      <div
        className={cn(
          'relative bg-white shadow-sm transition-transform',
          rotationClass[rotation],
        )}
        style={{ width, aspectRatio: `${page.width} / ${page.height}` }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={label}
          className="block size-full"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center">
            {error ? (
              <span
                role="img"
                aria-label={error.message}
                title={error.message}
                className="text-danger"
              >
                <AlertTriangle size={16} aria-hidden />
              </span>
            ) : (
              <Spinner size="sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
