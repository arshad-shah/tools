import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { renderHandlers } from './handlers';

exposeRpc(renderHandlers, self as unknown as RpcEndpoint);
