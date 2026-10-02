import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from './handlers';

exposeRpc(textHandlers, self as unknown as RpcEndpoint);
