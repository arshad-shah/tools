import React from 'react';
import { Notice } from '@arshad-shah/cynosure';
import { cn } from '@/shared/lib/cn';

const TONE = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info',
} as const;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: keyof typeof TONE;
  /**
   * Shows the status's icon. The node itself is not drawn: Cynosure's Notice
   * takes a Facet icon, and its tone icon already says the same thing.
   */
  icon?: React.ReactNode;
  /** sm: compact padding and small text (inline notes). Default md. */
  size?: 'sm' | 'md';
}

/**
 * Cynosure `Notice`. An `AlertTitle` child becomes the Notice's title; the
 * rest is its message. The outer div carries `id`, `data-*`, `ref` and the
 * layout className, which Notice does not take.
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ status = 'info', icon, size = 'md', children, ...props }, ref) => {
    let title: React.ReactNode;
    const body: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (
        title === undefined &&
        React.isValidElement<{ children?: React.ReactNode }>(child) &&
        child.type === AlertTitle
      ) {
        title = child.props.children;
      } else body.push(child);
    });
    return (
      <div ref={ref} {...props}>
        <Notice
          tone={TONE[status]}
          size={size}
          title={title}
          icon={icon ? undefined : null}
        >
          {body.length ? body : null}
        </Notice>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

/** The Notice's title; read by `Alert`, never rendered on its own. */
export const AlertTitle: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ children }) => <>{children}</>;
AlertTitle.displayName = 'AlertTitle';

/** A div, so lists and stacks inside it are valid; paragraphs are spaced. */
export const AlertDescription: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div className={cn('[&>p+p]:mt-2', className)} {...props} />
);
AlertDescription.displayName = 'AlertDescription';
