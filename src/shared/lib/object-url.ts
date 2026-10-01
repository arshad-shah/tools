import { useMemo, useSyncExternalStore } from 'react';

const noop = () => {};

/** An object URL that exists exactly while something is subscribed. */
function createUrlStore(bytes: Uint8Array | null, mime: string) {
  let url: string | null = null;
  return {
    subscribe(onChange: () => void) {
      if (!bytes) return noop;
      const own = URL.createObjectURL(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }),
      );
      url = own;
      onChange();
      return () => {
        URL.revokeObjectURL(own);
        if (url === own) url = null;
      };
    },
    get: () => url,
  };
}

const serverSnapshot = () => null;

/**
 * An object URL for `bytes`, revoked when the bytes change or on unmount.
 * The URL lives exactly as long as the subscription, so StrictMode's
 * unmount/remount gets a fresh URL instead of a revoked one.
 */
export function useObjectUrl(
  bytes: Uint8Array | null,
  mime: string,
): string | null {
  const store = useMemo(() => createUrlStore(bytes, mime), [bytes, mime]);
  return useSyncExternalStore(store.subscribe, store.get, serverSnapshot);
}
