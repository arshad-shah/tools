import { useMemo, useSyncExternalStore } from 'react';

const noop = () => {};

/** An object URL that exists exactly while something is subscribed. */
function createUrlStore(blob: (() => Blob) | null) {
  let url: string | null = null;
  return {
    subscribe(onChange: () => void) {
      if (!blob) return noop;
      const own = URL.createObjectURL(blob());
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
  const store = useMemo(
    () =>
      createUrlStore(
        bytes
          ? () => new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime })
          : null,
      ),
    [bytes, mime],
  );
  return useSyncExternalStore(store.subscribe, store.get, serverSnapshot);
}

/** An object URL for a Blob or File, with the same lifetime rules. */
export function useBlobUrl(blob: Blob | null): string | null {
  const store = useMemo(() => createUrlStore(blob ? () => blob : null), [blob]);
  return useSyncExternalStore(store.subscribe, store.get, serverSnapshot);
}
