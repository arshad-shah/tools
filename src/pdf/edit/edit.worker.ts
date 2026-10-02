import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { ALL_MATERIALIZERS } from '@/pdf/doc/materialize';
import { registerMaterializers } from '@/pdf/doc/materialize/registry';
import { editHandlers } from './worker/handlers';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);
exposeRpc(editHandlers, self as unknown as RpcEndpoint);
