import React from 'react';
import { EmptyState as CyEmptyState } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';

export interface EmptyStateProps {
  /** A Facet icon (`@arshad-shah/cynosure/icons`), shown above the title. */
  icon?: IconData;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Heading level of the title; default 3. */
  headingLevel?: 2 | 3 | 4;
  /** sm: a compact inline empty (lists, side panels). Default md. */
  size?: 'sm' | 'md';
  /** Layout only. */
  className?: string;
  /** Compound form: EmptyStateTitle, EmptyStateDescription, then actions. */
  children?: React.ReactNode;
}

const isPart = (
  node: React.ReactNode,
  part: React.FC<never>,
): node is React.ReactElement<{ children?: React.ReactNode }> =>
  React.isValidElement(node) && node.type === part;

/**
 * Cynosure `EmptyState`. Either the prop form (icon, title, description,
 * actions) or the compound form: an `EmptyStateTitle` child is the title, an
 * `EmptyStateDescription` child the description, and any other children
 * (buttons) the actions.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon,
  title,
  description,
  actions,
  headingLevel,
  size = 'md',
  children,
}) => {
  let partTitle: React.ReactNode;
  let partDescription: React.ReactNode;
  const rest: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (isPart(child, EmptyStateIcon)) return;
    if (isPart(child, EmptyStateTitle)) partTitle = child.props.children;
    else if (isPart(child, EmptyStateDescription))
      partDescription = child.props.children;
    else if (isPart(child, EmptyStateActions)) rest.push(child.props.children);
    else rest.push(child);
  });
  const extra = rest.filter(
    (n) => n !== null && n !== undefined && n !== false,
  );
  return (
    <CyEmptyState
      icon={icon}
      title={title ?? partTitle}
      description={description ?? partDescription}
      actions={
        actions || extra.length ? (
          <>
            {actions}
            {extra}
          </>
        ) : undefined
      }
      headingLevel={headingLevel}
      size={size}
      className={className}
    />
  );
};
EmptyState.displayName = 'EmptyState';

/** Compound parts: read by `EmptyState`, never rendered on their own. */
type Part = React.FC<{ children?: React.ReactNode }>;
export const EmptyStateIcon: Part = () => null;
EmptyStateIcon.displayName = 'EmptyStateIcon';
export const EmptyStateTitle: Part = ({ children }) => <>{children}</>;
EmptyStateTitle.displayName = 'EmptyStateTitle';
export const EmptyStateDescription: Part = ({ children }) => <>{children}</>;
EmptyStateDescription.displayName = 'EmptyStateDescription';
export const EmptyStateActions: Part = ({ children }) => <>{children}</>;
EmptyStateActions.displayName = 'EmptyStateActions';
