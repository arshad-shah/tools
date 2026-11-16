import { Toaster as CyToaster } from '@arshad-shah/cynosure';
import { NotifyBridge } from '@/shared/lib/notify-bridge';

/**
 * The app's single toast host (kit adapter over Cynosure's Toaster).
 * Toasts are raised through `notify` (@/shared/lib/notify).
 */
export function Toaster() {
  return (
    <CyToaster position="bottom-end">
      <NotifyBridge />
    </CyToaster>
  );
}
