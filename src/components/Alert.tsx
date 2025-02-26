import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  X as XIcon,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {Button} from './Button';

type AlertVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'promotional';

interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface AlertProps {
  /** The main title of the alert */
  title?: string;
  /** The alert message content */
  children: React.ReactNode;
  /** The visual variant of the alert */
  variant?: AlertVariant;
  /** Optional icon override */
  icon?: React.ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Optional actions for the alert */
  actions?: AlertAction[];
  /** Additional CSS classes */
  className?: string;
  /** Optional link */
  link?: {
    href: string;
    label: string;
    onClick?: () => void;
  };
}

export const Alert: React.FC<AlertProps> = ({
  title,
  children,
  variant = 'neutral',
  icon,
  dismissible = false,
  onDismiss,
  actions = [],
  className,
  link,
}) => {
  // Variant-specific styles and icons
  const variants = {
    success: {
      containerClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600',
      titleClass: 'text-emerald-800',
      textClass: 'text-emerald-700',
      buttonClass: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    error: {
      containerClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      titleClass: 'text-red-800',
      textClass: 'text-red-700',
      buttonClass: 'bg-red-100 text-red-700 hover:bg-red-200',
      icon: <XCircle className="w-5 h-5" />,
    },
    warning: {
      containerClass: 'bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600',
      titleClass: 'text-amber-800',
      textClass: 'text-amber-700',
      buttonClass: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600',
      titleClass: 'text-blue-800',
      textClass: 'text-blue-700',
      buttonClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      icon: <Info className="w-5 h-5" />,
    },
    neutral: {
      containerClass: 'bg-gray-50 border-gray-200',
      iconClass: 'text-gray-600',
      titleClass: 'text-gray-800',
      textClass: 'text-gray-700',
      buttonClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      icon: <Info className="w-5 h-5" />,
    },
    promotional: {
      containerClass:
        'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200',
      iconClass: 'text-purple-600',
      titleClass: 'text-purple-800',
      textClass: 'text-purple-700',
      buttonClass: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      icon: <Info className="w-5 h-5" />,
    },
  };

  const variantStyles = variants[variant];

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border shadow-sm',
        variantStyles.containerClass,
        className
      )}
      role="alert"
    >
      <div className="flex gap-4 justify-between w-full">
        {/* Icon */}
        <div className={cn('flex-shrink-0', variantStyles.iconClass)}>
          {icon || variantStyles.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3 className={cn('font-medium mb-1', variantStyles.titleClass)}>
              {title}
            </h3>
          )}

          <div className={cn('text-sm', variantStyles.textClass)}>
            {children}
          </div>

          {/* Actions */}
          {(actions.length > 0 || link) && (
            <div className="flex gap-3 mt-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  size="sm"
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    action.variant === 'secondary'
                      ? variantStyles.buttonClass
                      : 'bg-white border shadow-sm hover:shadow-md'
                  )}
                >
                  {action.label}
                </Button>
              ))}
              {link && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={link.onClick}
                  className={cn(
                    'inline-flex items-center gap-1 text-sm',
                    variantStyles.textClass,
                    'hover:underline'
                  )}
                >
                  {link.label}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <div>
        {/* Dismiss button */}
        {dismissible && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="icon"
            className={cn(
              'p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity',
              variantStyles.buttonClass
            )}
            aria-label="Dismiss alert"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

Alert.displayName = 'Alert';
