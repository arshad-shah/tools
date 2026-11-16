import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Same-origin links route on the client. Cynosure's Link, Card, ListRow,
 * Button and Breadcrumbs render plain anchors (they take no router link),
 * so a plain left click on one is turned into a router navigation here.
 * Modified clicks, other targets, downloads, in-page anchors and links
 * that already handled the click keep the browser's behaviour.
 */
export function useClientLinks(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download'))
        return;
      const raw = a.getAttribute('href') ?? '';
      if (raw.startsWith('#')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);
}
