import type { IconData } from '@arshad-shah/cynosure/icons';
import {
  bold,
  code,
  heading,
  italic,
  link,
  list,
  listChecks,
  listOrdered,
  quote,
  table,
} from '@arshad-shah/cynosure/icons';
import type { FormatAction } from '../lib/format-actions';

export interface FormatItem {
  action: FormatAction;
  label: string;
  icon: IconData;
  shortcut?: string;
}

/** Toolbar buttons and their Mod+K commands (spec §9.2). */
export const FORMAT_ITEMS: FormatItem[] = [
  { action: 'bold', label: 'Bold', icon: bold, shortcut: 'Mod+B' },
  { action: 'italic', label: 'Italic', icon: italic, shortcut: 'Mod+I' },
  { action: 'code', label: 'Inline code', icon: code },
  { action: 'link', label: 'Link', icon: link, shortcut: 'Mod+Shift+L' },
  { action: 'h1', label: 'Heading 1', icon: heading },
  { action: 'h2', label: 'Heading 2', icon: heading },
  { action: 'h3', label: 'Heading 3', icon: heading },
  { action: 'ul', label: 'Bulleted list', icon: list },
  {
    action: 'ol',
    label: 'Numbered list',
    icon: listOrdered,
    shortcut: 'Mod+Shift+7',
  },
  { action: 'task', label: 'Task list', icon: listChecks },
  { action: 'quote', label: 'Quote', icon: quote },
  { action: 'table', label: 'Table', icon: table },
];
