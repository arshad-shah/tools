import { Toaster as CyToaster, useToast } from '@arshad-shah/cynosure';
import { useEffect } from 'react';
import { connectToaster } from '@/shared/lib/notify';

/** Hands the Toaster's API to `notify`, which code outside React calls. */
function NotifyBridge() {
  const api = useToast();
  useEffect(() => {
    connectToaster(api);
    return () => connectToaster(null);
  }, [api]);
  return null;
}

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
