import { useToast } from '@arshad-shah/cynosure';
import { useEffect } from 'react';
import { connectToaster } from './notify';

/**
 * Hands the surrounding Cynosure Toaster's API to `notify`, which code
 * outside React calls. Render it once inside each Toaster.
 */
export function NotifyBridge(): null {
  const api = useToast();
  useEffect(() => {
    connectToaster(api);
    return () => connectToaster(null);
  }, [api]);
  return null;
}
