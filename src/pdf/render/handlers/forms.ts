import type { RpcContext } from '@/shared/lib/worker-rpc';
import { readFormInfo, type FormInfo } from '../form-info';
import { getDoc } from './state';

export const formHandlers = {
  /** AcroForm widgets with their values, and the AcroForm and XFA flags. */
  formInfo: (_ctx: RpcContext, docId: string): Promise<FormInfo> =>
    readFormInfo(getDoc(docId)),
};
