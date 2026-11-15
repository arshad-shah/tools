import React from 'react';
import { Card as CyCard, Heading, Stack, Text } from '@arshad-shah/cynosure';

interface CardProps {
  /** With `onClick`: the whole card is one button (kept for call sites). */
  interactive?: boolean;
  /** Makes the whole card a button. Put other controls in `actions`. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Buttons that act on their own, placed over the card's top end. */
  actions?: React.ReactNode;
  /** Marks a button card as the current one of a set (accent border). */
  'aria-current'?: React.AriaAttributes['aria-current'];
  'aria-label'?: string;
  'data-testid'?: string;
  /** Layout only. */
  className?: string;
  children?: React.ReactNode;
}

type Slot = React.ReactElement<{
  className?: string;
  children?: React.ReactNode;
  as?: 'h2' | 'h3' | 'h4';
}>;
const is = (node: React.ReactNode, part: unknown): node is Slot =>
  React.isValidElement(node) && node.type === part;

const LEVEL = { h2: 2, h3: 3, h4: 4 } as const;

/**
 * Cynosure `Card`. A `CardHeader` holding only a `CardTitle` (and a
 * `CardDescription`) becomes the card's title and description; any other
 * header, `CardBody` and `CardFooter` are its content, in order.
 */
export const Card = React.forwardRef<HTMLElement, CardProps>(
  (
    {
      onClick,
      actions,
      className,
      children,
      'aria-current': current,
      'aria-label': label,
      'data-testid': testId,
    },
    ref,
  ) => {
    let title: React.ReactNode;
    let description: React.ReactNode;
    let headingLevel: 2 | 3 | 4 | undefined;
    const parts: React.ReactNode[] = [];
    React.Children.forEach(children, (child, i) => {
      if (is(child, CardHeader)) {
        const inner = React.Children.toArray(child.props.children);
        const plain =
          title === undefined &&
          inner.length > 0 &&
          inner.every((n) => is(n, CardTitle) || is(n, CardDescription));
        if (plain) {
          for (const n of inner as Slot[]) {
            if (n.type === CardTitle) {
              title = n.props.children;
              headingLevel = LEVEL[n.props.as ?? 'h3'];
            } else description = n.props.children;
          }
          return;
        }
      }
      if (is(child, CardHeader) || is(child, CardBody) || is(child, CardFooter))
        parts.push(
          <div key={i} className={child.props.className}>
            {child.props.children}
          </div>,
        );
      else parts.push(child);
    });
    return (
      <CyCard
        ref={ref}
        title={title}
        description={description}
        headingLevel={headingLevel}
        onClick={onClick}
        actions={actions}
        aria-current={current}
        aria-label={label}
        data-testid={testId}
        className={className}
      >
        {parts.length > 1 ? <Stack gap="5">{parts}</Stack> : parts}
      </CyCard>
    );
  },
);
Card.displayName = 'Card';

type PartProps = { className?: string; children?: React.ReactNode };

/** The card's top: read by `Card` (see there). */
export const CardHeader: React.FC<PartProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
CardHeader.displayName = 'CardHeader';

/** A block of the card's content: read by `Card`. */
export const CardBody: React.FC<PartProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
CardBody.displayName = 'CardBody';

/** The card's last block: read by `Card`. */
export const CardFooter: React.FC<PartProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
CardFooter.displayName = 'CardFooter';

/** A card heading where it cannot be the card's own title: Cynosure `Heading`. */
export const CardTitle: React.FC<
  PartProps & { as?: 'h2' | 'h3' | 'h4'; id?: string }
> = ({ as = 'h3', className, id, children }) => (
  <Heading level={LEVEL[as]} size="md" id={id} className={className}>
    {children}
  </Heading>
);
CardTitle.displayName = 'CardTitle';

/** A quieter line under a card heading: Cynosure `Text`. */
export const CardDescription: React.FC<PartProps> = ({
  className,
  children,
}) => (
  <Text as="p" size="sm" tone="muted" className={className}>
    {children}
  </Text>
);
CardDescription.displayName = 'CardDescription';
