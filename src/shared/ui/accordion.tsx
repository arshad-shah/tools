import React from 'react';
import {
  Accordion as CyAccordion,
  AccordionItem as CyAccordionItem,
} from '@arshad-shah/cynosure';

interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
const all = (v?: string | string[]) =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

/**
 * Cynosure `Accordion` (card sections). `single` keeps the open section
 * closable, as before.
 */
export const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  defaultValue,
  className,
  children,
}) =>
  type === 'multiple' ? (
    <CyAccordion
      type="multiple"
      variant="card"
      defaultValue={all(defaultValue)}
      className={className}
    >
      {children}
    </CyAccordion>
  ) : (
    <CyAccordion
      type="single"
      collapsible
      variant="card"
      defaultValue={first(defaultValue)}
      className={className}
    >
      {children}
    </CyAccordion>
  );
Accordion.displayName = 'Accordion';

interface AccordionItemProps {
  value: string;
  /** Layout only. */
  className?: string;
  /** An `AccordionTrigger` (the header) and an `AccordionContent`. */
  children: React.ReactNode;
}

/** A Cynosure `AccordionItem`: the trigger's children are its summary. */
export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  children,
}) => {
  let summary: React.ReactNode;
  const content: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return;
    if (child.type === AccordionTrigger) summary = child.props.children;
    else if (child.type === AccordionContent)
      content.push(child.props.children);
  });
  return (
    <CyAccordionItem value={value} summary={summary}>
      {content}
    </CyAccordionItem>
  );
};
AccordionItem.displayName = 'AccordionItem';

/** The section header; read by `AccordionItem`, never rendered on its own. */
export const AccordionTrigger: React.FC<
  React.HTMLAttributes<HTMLButtonElement>
> = ({ children }) => <>{children}</>;
AccordionTrigger.displayName = 'AccordionTrigger';

/** The section body; read by `AccordionItem`, never rendered on its own. */
export const AccordionContent: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ children }) => <>{children}</>;
AccordionContent.displayName = 'AccordionContent';
