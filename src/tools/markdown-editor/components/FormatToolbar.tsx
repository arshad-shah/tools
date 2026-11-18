import { IconButton, Menu, Toolbar } from '@arshad-shah/cynosure';
import { heading, list } from '@arshad-shah/cynosure/icons';
import type { FormatAction } from '../lib/format-actions';
import { FORMAT_ITEMS, type FormatItem } from './format-items';

/** Headings and lists each fold into one menu; the rest are buttons. */
const MENUS: {
  label: string;
  icon: typeof heading;
  actions: FormatAction[];
}[] = [
  { label: 'Heading', icon: heading, actions: ['h1', 'h2', 'h3'] },
  { label: 'List', icon: list, actions: ['ul', 'ol', 'task'] },
];

const inMenu = (a: FormatAction) => MENUS.find((m) => m.actions.includes(a));
const item = (a: FormatAction) => FORMAT_ITEMS.find((i) => i.action === a)!;

export interface FormatToolbarProps {
  onFormat(action: FormatAction): void;
}

/**
 * The formatting toolbar: Bold, Italic, Inline code, Link, a Heading menu
 * (1 to 3), a List menu (bulleted, numbered, task), Quote and Table. Every
 * format is also a Mod+K command with its shortcut.
 */
export function FormatToolbar({ onFormat }: FormatToolbarProps) {
  const button = (i: FormatItem) => (
    <IconButton
      key={i.action}
      label={i.label}
      icon={i.icon}
      size="sm"
      variant="ghost"
      tone="neutral"
      keepFocus
      onClick={() => onFormat(i.action)}
    />
  );
  const menu = (m: (typeof MENUS)[number]) => (
    <Menu
      key={m.label}
      label={m.label}
      items={m.actions.map((a) => ({
        value: a,
        label: item(a).label,
        icon: item(a).icon,
        shortcut: item(a).shortcut?.toLowerCase(),
      }))}
      onSelect={(v) => onFormat(v as FormatAction)}
      trigger={(props) => (
        <IconButton
          {...props}
          label={m.label}
          icon={m.icon}
          size="sm"
          variant="ghost"
          tone="neutral"
        />
      )}
    />
  );
  return (
    <Toolbar label="Formatting">
      {FORMAT_ITEMS.map((i) => {
        const m = inMenu(i.action);
        if (!m) return button(i);
        return m.actions[0] === i.action ? menu(m) : null;
      })}
    </Toolbar>
  );
}
