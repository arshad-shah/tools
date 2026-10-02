import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { photoHandlers } from './handlers';

exposeRpc(photoHandlers, self as unknown as RpcEndpoint);
