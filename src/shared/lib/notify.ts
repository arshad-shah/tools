import { toast } from 'sonner';
import { ToolError } from './errors';

/** App-wide toasts. Rendered by the single <Toaster/> in App. */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast(message),
  error: (error: string | ToolError) =>
    toast.error(typeof error === 'string' ? error : error.message),
};
