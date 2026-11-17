import { Disclosure } from '@arshad-shah/cynosure';
import type { ReactNode } from 'react';

/** A titled, collapsible part of the properties panel (an h3 and a region). */
export function InspectorSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Disclosure
      summary={title}
      variant="line"
      headingLevel={3}
      region
      defaultOpen={defaultOpen}
      size="sm"
    >
      {children}
    </Disclosure>
  );
}
