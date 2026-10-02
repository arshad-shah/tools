import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { layoutHandlers } from './layout-core';

exposeRpc(layoutHandlers, self as unknown as RpcEndpoint);
