import { createContext } from 'react';

export type ShellLayout = 'standard' | 'focus';

/** The shell layout (Standard or Focus) and its setter, provided by AppShell. */
export const LayoutContext = createContext<{
  layout: ShellLayout;
  setLayout(l: ShellLayout): void;
}>({ layout: 'standard', setLayout: () => {} });
