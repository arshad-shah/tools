import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { regexHandlers } from './handlers';

exposeRpc(regexHandlers, self as unknown as RpcEndpoint);
