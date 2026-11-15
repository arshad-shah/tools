import React from 'react';
import { List as CyList } from '@arshad-shah/cynosure';

interface ListProps {
  /** Names the list when no heading above it does. */
  'aria-label'?: string;
  /** Layout only. */
  className?: string;
  /** `ListItem`s. */
  children?: React.ReactNode;
  /** Data attributes (e.g. `data-dynamic`) land on a wrapper element. */
  [data: `data-${string}`]: string | undefined;
}

/**
 * Cynosure `List` with accent disc markers. Each `ListItem` child is one
 * item; its children are the item's label.
 */
export const List: React.FC<ListProps> = ({
  'aria-label': label,
  className,
  children,
  ...data
}) => {
  const items: { id?: string; label: React.ReactNode }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<ListItemProps>(child) || child.type !== ListItem)
      return;
    const { className: itemClass, children: content } = child.props;
    items.push({
      id: child.key ?? undefined,
      label: itemClass ? <span className={itemClass}>{content}</span> : content,
    });
  });
  const list = (
    <CyList
      items={items}
      marker="disc"
      tone="accent"
      gap="sm"
      size="sm"
      label={label}
      className={className}
    />
  );
  return Object.keys(data).length ? <div {...data}>{list}</div> : list;
};
List.displayName = 'List';

interface ListItemProps {
  /** Text styling of the item's label (e.g. mono). */
  className?: string;
  children?: React.ReactNode;
}

/** One item of a `List`; read by `List`, never rendered on its own. */
export const ListItem: React.FC<ListItemProps> = ({ children }) => (
  <>{children}</>
);
ListItem.displayName = 'ListItem';
