import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { imageHandlers } from './image-handlers';

exposeRpc(imageHandlers, self as unknown as RpcEndpoint);
