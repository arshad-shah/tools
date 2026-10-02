import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/shared/lib/theme';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
} from './icons';
import { Spinner } from './spinner';

/**
 * The app's single toast host (kit adapter over sonner): follows the theme,
 * uses token classes and kit icons, so sonner's own glyph icons never render.
 * Toasts are raised through `notify` (@/shared/lib/notify).
 */
export function Toaster() {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      icons={{
        success: <IconCheck size="sm" className="text-accent-fg" />,
        info: <IconInfo size="sm" className="text-info" />,
        warning: <IconAlertTriangle size="sm" className="text-warning" />,
        error: <IconAlertCircle size="sm" className="text-danger" />,
        loading: <Spinner size="sm" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'z-toast flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg bg-surface p-3 text-sm text-fg shadow-e2',
          title: 'font-medium text-fg',
          description: 'text-fg-muted',
          icon: 'mt-0.5 shrink-0',
          actionButton:
            'ml-auto shrink-0 rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          closeButton: 'text-fg-subtle hover:text-fg',
        },
      }}
    />
  );
}
Toaster.displayName = 'Toaster';
