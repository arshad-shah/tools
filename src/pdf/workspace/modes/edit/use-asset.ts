import { useEffect, useState } from 'react';
import type { WorkspaceActions } from '../../workspace-context';

/** An asset's bytes from the document's blob store; null while loading. */
export function useAssetBytes(
  ws: WorkspaceActions,
  id: string,
): Uint8Array | null {
  const [got, setGot] = useState<{ id: string; bytes: Uint8Array } | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    ws.session.blobs.assetBytes(id).then(
      (bytes) => live && setGot({ id, bytes }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [ws, id]);
  return got?.id === id ? got.bytes : null;
}
