import type { ReactNode } from 'react';
import {
  IconCode,
  IconLink,
  IconList,
  IconListOrdered,
  IconListTodo,
  IconTable,
} from '@/shared/ui/icons';
import type { FormatAction } from '../lib/format-actions';

export interface FormatItem {
  action: FormatAction;
  label: string;
  icon: ReactNode;
  shortcut?: string;
}

const letters = (s: string, className = '') => (
  <span aria-hidden className={`font-mono text-sm ${className}`}>
    {s}
  </span>
);

/** Toolbar buttons and their Mod+K commands (spec §9.2). */
export const FORMAT_ITEMS: FormatItem[] = [
  {
    action: 'bold',
    label: 'Bold',
    icon: letters('B', 'font-bold'),
    shortcut: 'Mod+B',
  },
  {
    action: 'italic',
    label: 'Italic',
    icon: letters('I', 'italic'),
    shortcut: 'Mod+I',
  },
  { action: 'code', label: 'Inline code', icon: <IconCode size="sm" /> },
  {
    action: 'link',
    label: 'Link',
    icon: <IconLink size="sm" />,
    shortcut: 'Mod+Shift+L',
  },
  { action: 'h1', label: 'Heading 1', icon: letters('H1') },
  { action: 'h2', label: 'Heading 2', icon: letters('H2') },
  { action: 'h3', label: 'Heading 3', icon: letters('H3') },
  { action: 'ul', label: 'Bulleted list', icon: <IconList size="sm" /> },
  {
    action: 'ol',
    label: 'Numbered list',
    icon: <IconListOrdered size="sm" />,
    shortcut: 'Mod+Shift+7',
  },
  { action: 'task', label: 'Task list', icon: <IconListTodo size="sm" /> },
  { action: 'quote', label: 'Quote', icon: letters('Q') },
  { action: 'table', label: 'Table', icon: <IconTable size="sm" /> },
];
