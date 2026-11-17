import { useEffect } from 'react';

/**
 * Shows `href` as the tab icon while it is non-null (a progress ring, a
 * badge), restoring the page's own icon on null or unmount. Every
 * `link[rel~=icon]` is pointed at it, so the SVG icon does not win.
 */
export function useFavicon(href: string | null): void {
  useEffect(() => {
    if (href === null || typeof document === 'undefined') return;
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
    );
    let added: HTMLLinkElement | null = null;
    if (links.length === 0) {
      added = document.createElement('link');
      added.rel = 'icon';
      document.head.appendChild(added);
      links.push(added);
    }
    const saved = links.map((l) => ({
      link: l,
      href: l.getAttribute('href'),
      type: l.getAttribute('type'),
    }));
    for (const l of links) {
      l.setAttribute('href', href);
      l.setAttribute('type', 'image/png');
    }
    return () => {
      for (const { link, href: h, type } of saved) {
        if (h === null) link.removeAttribute('href');
        else link.setAttribute('href', h);
        if (type === null) link.removeAttribute('type');
        else link.setAttribute('type', type);
      }
      added?.remove();
    };
  }, [href]);
}

/**
 * Paints a square icon on a scratch canvas and returns it as a PNG data
 * URL for `useFavicon` ('' when 2D canvas is unavailable).
 */
export function renderFaviconImage(
  size: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  paint(ctx);
  return canvas.toDataURL('image/png');
}
