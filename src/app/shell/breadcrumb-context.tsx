import React, { useState } from 'react';
import {
  BreadcrumbSetterContext,
  BreadcrumbValueContext,
  type BreadcrumbSegment,
} from './breadcrumb';

/** Holds the breadcrumb that the current page sets for the TopBar. */
export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
  return (
    <BreadcrumbSetterContext.Provider value={setSegments}>
      <BreadcrumbValueContext.Provider value={segments}>
        {children}
      </BreadcrumbValueContext.Provider>
    </BreadcrumbSetterContext.Provider>
  );
}
