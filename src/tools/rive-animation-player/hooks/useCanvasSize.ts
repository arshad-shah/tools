import { useEffect, useState, type RefObject } from 'react';
import type { Rive } from '@/shared/ui/adapters/rive-runtime';
import type { Dimensions } from '../types';

/**
 * Tracks the preview's size (on mount, window resize and, where supported,
 * any resize of the preview itself, such as a device frame) and keeps the
 * canvas and the Rive layout bounds in step with it.
 */
export function useCanvasSize(
  previewRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  riveRef: RefObject<Rive | null>,
) {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const rive = riveRef.current;
    if (canvasRef.current && dimensions && rive) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
      rive.resizeToCanvas();
    }
  }, [dimensions, canvasRef, riveRef]);

  useEffect(() => {
    const updateDimensions = () => {
      const rect =
        previewRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
      // Functional update: compare against the latest size, not the size
      // captured when the listener was added.
      setDimensions((d) =>
        rect.width === d.width && rect.height === d.height
          ? d
          : { width: rect.width, height: rect.height },
      );
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const el = previewRef.current;
    const observer =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateDimensions)
        : null;
    if (el) observer?.observe(el);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer?.disconnect();
    };
  }, [previewRef]);

  return dimensions;
}
