import { useEffect, useState } from 'react';

/** The part of the layout viewport the person can see right now. */
export interface VisibleViewport {
  /** CSS px from the layout viewport's top (pinch zoom panned down). */
  top: number;
  /** CSS px tall. */
  height: number;
  /**
   * CSS px of the layout viewport hidden below the visible part, i.e. the
   * on-screen keyboard. A `position: fixed` bar sets this as its `bottom`
   * to sit just above the keyboard.
   */
  bottomInset: number;
}

/** Reads `window.visualViewport`; without one, the whole window. */
export function readVisibleViewport(): VisibleViewport {
  if (typeof window === 'undefined')
    return { top: 0, height: 0, bottomInset: 0 };
  const full = window.innerHeight;
  const vv = window.visualViewport;
  if (!vv) return { top: 0, height: full, bottomInset: 0 };
  return {
    top: vv.offsetTop,
    height: vv.height,
    bottomInset: Math.max(0, Math.round(full - vv.height - vv.offsetTop)),
  };
}

const same = (a: VisibleViewport, b: VisibleViewport) =>
  a.top === b.top && a.height === b.height && a.bottomInset === b.bottomInset;

/**
 * The visible viewport, kept current through the on-screen keyboard
 * opening and closing (visualViewport resize and scroll) and window
 * resizes.
 */
export function useVisibleViewport(): VisibleViewport {
  const [box, setBox] = useState(readVisibleViewport);
  useEffect(() => {
    const update = () =>
      setBox((prev) => {
        const next = readVisibleViewport();
        return same(prev, next) ? prev : next;
      });
    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return box;
}
