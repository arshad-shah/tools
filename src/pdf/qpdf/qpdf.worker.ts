import wasmUrl from '@arshad-shah/qpdf-wasm/qpdf.wasm?url';
import { configure } from '@arshad-shah/qpdf-wasm';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { qpdfHandlers } from './handlers';

// Served from our own origin (Vite emits the asset); never a CDN.
configure({ wasmUrl });
exposeRpc(qpdfHandlers, self as unknown as RpcEndpoint);
