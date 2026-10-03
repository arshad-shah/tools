import { createContext } from 'react';

/**
 * The element in the tool page header that holds page-level actions (Share,
 * Export, Send to). ToolPage provides it; a tool rendered elsewhere (tests,
 * a hub preview) has none and its actions render in place.
 */
export const ToolActionsSlot = createContext<HTMLElement | null>(null);
