import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { createSqlHandlers } from './handlers';

// The wasm is served from our own origin (Vite emits the asset); never a CDN.
exposeRpc(
  createSqlHandlers(() => initSqlJs({ locateFile: () => wasmUrl })),
  self as unknown as RpcEndpoint,
);
