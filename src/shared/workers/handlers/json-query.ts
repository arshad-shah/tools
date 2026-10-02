import type { RpcContext } from '@/shared/lib/worker-rpc';
import { jsonQueryRows } from '@/tools/json-and-xml-viewer/lib/query';

/** JSONPath queries off the main thread (JSON & XML Viewer, spec 4.4). */
export default {
  'json.query': (_ctx: RpcContext, value: unknown, expr: string) =>
    jsonQueryRows(value, expr),
};
