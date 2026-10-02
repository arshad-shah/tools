import { parseJsonFlat } from '@/shared/lib/data-formats/json-flat';
import { parseJsonWithLocations } from '@/shared/lib/data-formats/json-locate';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';

/** JSON parsing off the main thread for large documents (JSON & XML Viewer). */
export default {
  'json.parseWithLocations': (_ctx: RpcContext, text: string) =>
    parseJsonWithLocations(text),
  /** Offsets as transferred typed arrays; no value (the caller parses it natively). */
  'json.parseFlat': (_ctx: RpcContext, text: string) => {
    const r = parseJsonFlat(text);
    const { kinds, starts, ends, keyStarts, counts } = r.flat;
    return new Transferred(r, [
      kinds.buffer,
      starts.buffer,
      ends.buffer,
      keyStarts.buffer,
      counts.buffer,
    ]);
  },
};
