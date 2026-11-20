import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { keypairHandlers } from './handlers';

exposeRpc(keypairHandlers, self as unknown as RpcEndpoint);
