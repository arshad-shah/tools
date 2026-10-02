import { useEffect, useState } from 'react';
import { loadEffWordlist } from '../lib/passphrase';

/** The EFF list, loaded once per page (a lazy chunk). */
export function useWordlist(): readonly string[] | null {
  const [list, setList] = useState<readonly string[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadEffWordlist().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, []);
  return list;
}
