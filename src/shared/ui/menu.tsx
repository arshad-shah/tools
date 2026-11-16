import React from 'react';
import { Menu, type MenuEntry, type MenuItem } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
import { cn } from '@/shared/lib/cn';
import { facetOf } from './icons';
import { ShortcutHint } from './shortcut-hint';

/**
 * The kit DropdownMenu, composed as before
 * (`<DropdownMenu><DropdownMenuTrigger/><DropdownMenuContent>…</>`), drawn
 * by Cynosure's Menu: a top-layer list with arrow keys, Home and End,
 * type-ahead, Escape and outside clicks, focus back to the trigger. The
 * items declare themselves (any component may render them) and the menu
 * lists them in document order.
 */

interface ItemRecord {
  label: string;
  /** A kit icon in the item's children, drawn by Cynosure's Menu. */
  icon?: IconData;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  separator?: true;
  /** The item's latest click handler. */
  run: React.RefObject<(() => void) | undefined>;
  /** Hidden marker that orders the items as the document does. */
  marker: React.RefObject<HTMLSpanElement | null>;
}

interface MenuCtx {
  open: boolean;
  setOpen: (open: boolean) => void;
  entries: MenuEntry[];
  /** The Content's accessible name and layout classes. */
  content: { label?: string; className?: string };
  setContent: (c: { label?: string; className?: string }) => void;
  register: (id: string, record: ItemRecord) => () => void;
  run: (id: string) => void;
}
const Ctx = React.createContext<MenuCtx | null>(null);

const same = (a: ItemRecord, b: ItemRecord) =>
  a.label === b.label &&
  a.icon === b.icon &&
  a.shortcut === b.shortcut &&
  a.disabled === b.disabled &&
  a.destructive === b.destructive &&
  a.separator === b.separator;

/** Items between separators become unlabelled sections (lines between). */
function toEntries(records: [string, ItemRecord][]): MenuEntry[] {
  const groups: MenuItem[][] = [[]];
  for (const [id, r] of records) {
    if (r.separator) {
      if (groups[groups.length - 1].length) groups.push([]);
      continue;
    }
    groups[groups.length - 1].push({
      value: id,
      label: r.label,
      ...(r.icon ? { icon: r.icon } : {}),
      ...(r.shortcut ? { shortcut: r.shortcut } : {}),
      ...(r.disabled ? { disabled: true } : {}),
      ...(r.destructive ? { tone: 'danger' as const } : {}),
    });
  }
  const used = groups.filter((g) => g.length);
  return used.length > 1 ? used.map((items) => ({ items })) : (used[0] ?? []);
}

interface ReadLabel {
  text: string;
  keys: string;
  icon?: IconData;
}

/**
 * Text of a node (an item's label), the keys of a ShortcutHint in it and its
 * first kit icon.
 */
function readLabel(
  node: React.ReactNode,
  out: ReadLabel = { text: '', keys: '' },
): ReadLabel {
  if (node == null || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.text += String(node);
  } else if (Array.isArray(node)) {
    for (const n of node) readLabel(n, out);
  } else if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    const icon = facetOf(node);
    if (icon) out.icon ??= icon;
    else if (node.type === ShortcutHint)
      out.keys = (node.props as { keys: string }).keys;
    else readLabel(node.props.children, out);
  }
  return out;
}

/** Dropdown menu: <DropdownMenu><DropdownMenuTrigger/><DropdownMenuContent>…</> */
export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  /** Added to the wrapper, for layout. */
  className?: string;
}> = ({ children, className }) => {
  const [open, setOpen] = React.useState(false);
  const [content, setContentState] = React.useState<{
    label?: string;
    className?: string;
  }>({});
  const records = React.useRef(new Map<string, ItemRecord>());
  const [entries, setEntries] = React.useState<MenuEntry[]>([]);
  const publish = React.useCallback(() => {
    const list = [...records.current].sort(([, a], [, b]) => {
      const x = a.marker.current;
      const y = b.marker.current;
      if (!x || !y) return 0;
      return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    setEntries(toEntries(list));
  }, []);
  const register = React.useCallback(
    (id: string, record: ItemRecord) => {
      const prev = records.current.get(id);
      records.current.set(id, record);
      if (!prev || !same(prev, record)) publish();
      return () => {
        records.current.delete(id);
        publish();
      };
    },
    [publish],
  );
  const run = React.useCallback((id: string) => {
    records.current.get(id)?.run.current?.();
  }, []);
  const setContent = React.useCallback(
    (c: { label?: string; className?: string }) =>
      setContentState((p) =>
        p.label === c.label && p.className === c.className ? p : c,
      ),
    [],
  );
  const ctx = React.useMemo(
    () => ({ open, setOpen, entries, content, setContent, register, run }),
    [open, entries, content, setContent, register, run],
  );
  return (
    <Ctx.Provider value={ctx}>
      <div className={cn('relative inline-flex', className)}>{children}</div>
    </Ctx.Provider>
  );
};

type TriggerChildProps = {
  ref?: React.Ref<HTMLElement>;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  label?: string;
  'aria-label'?: string;
  children?: React.ReactNode;
};

const setRef = <T,>(ref: React.Ref<T> | undefined, value: T) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.RefObject<T>).current = value;
};

/** The one control that opens the menu (a Button or IconButton). */
export const DropdownMenuTrigger: React.FC<{
  children: React.ReactElement;
  /** From a Tooltip around the trigger: passed on to the control. */
  'aria-describedby'?: string;
}> = ({ children, 'aria-describedby': describedBy }) => {
  const ctx = React.useContext(Ctx)!;
  const triggerEl = React.useRef<HTMLElement | null>(null);
  const child = children as React.ReactElement<TriggerChildProps>;
  // Items that arrive after the menu opened (an async list behind a
  // status row): the first one takes focus, as it would have on opening.
  const { open, entries } = ctx;
  React.useEffect(() => {
    if (!open) return;
    const panel = document.getElementById(
      triggerEl.current?.getAttribute('aria-controls') ?? '',
    );
    if (!panel || panel.contains(document.activeElement)) return;
    panel
      .querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      )
      ?.focus({ preventScroll: true });
  }, [open, entries]);
  const own = child.props;
  const name =
    ctx.content.label ??
    own['aria-label'] ??
    own.label ??
    (readLabel(own.children).text.trim() || 'Menu');
  return (
    <Menu
      label={name}
      items={ctx.entries}
      open={ctx.open}
      onOpenChange={ctx.setOpen}
      onSelect={ctx.run}
      className={ctx.content.className}
      trigger={(p) =>
        React.cloneElement(child, {
          ref: (el: HTMLElement | null) => {
            triggerEl.current = el;
            setRef(own.ref, el);
            setRef(p.ref as React.Ref<HTMLElement | null>, el);
          },
          'aria-haspopup': p['aria-haspopup'],
          'aria-expanded': p['aria-expanded'],
          'aria-controls': p['aria-controls'],
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            own.onClick?.(e);
            p.onClick();
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            own.onKeyDown?.(e);
            if (!e.defaultPrevented)
              p.onKeyDown(e as React.KeyboardEvent<HTMLButtonElement>);
          },
        } as Partial<TriggerChildProps>)
      }
    />
  );
};

interface ContentProps {
  /** Kept for the callers; Cynosure lines the menu up with the trigger's start. */
  align?: 'start' | 'end';
  /** Accessible name of the menu (default: the trigger's name). */
  'aria-label'?: string;
  /** Added to the menu panel, for layout. */
  className?: string;
  children?: React.ReactNode;
}

/** The menu's items. Nothing of it is drawn here: Cynosure draws the list. */
export const DropdownMenuContent: React.FC<ContentProps> = ({
  'aria-label': label,
  className,
  children,
}) => {
  const ctx = React.useContext(Ctx)!;
  const { setContent } = ctx;
  React.useLayoutEffect(
    () => setContent({ label, className }),
    [label, className, setContent],
  );
  return <span hidden>{children}</span>;
};

interface ItemProps {
  /** Runs when the item is chosen; the menu then closes. */
  onClick?: () => void;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
  destructive?: boolean;
  /** Kept for the callers; Cynosure draws the row. */
  className?: string;
  /** Shown from `aria-keyshortcuts` or a ShortcutHint in the children. */
  'aria-keyshortcuts'?: string;
  /** The label: its text, a ShortcutHint and a kit icon (`<IconX />`). */
  children?: React.ReactNode;
}

function useItem(
  record: Omit<ItemRecord, 'marker' | 'run'>,
  onClick?: () => void,
) {
  const { register } = React.useContext(Ctx)!;
  const id = React.useId();
  const marker = React.useRef<HTMLSpanElement>(null);
  const run = React.useRef(onClick);
  React.useLayoutEffect(() => {
    run.current = onClick;
  });
  const { label, icon, shortcut, disabled, destructive, separator } = record;
  React.useLayoutEffect(
    () =>
      register(id, {
        label,
        ...(icon ? { icon } : {}),
        shortcut,
        disabled,
        destructive,
        separator,
        run,
        marker,
      }),
    [register, id, label, icon, shortcut, disabled, destructive, separator],
  );
  return marker;
}

export const DropdownMenuItem: React.FC<ItemProps> = ({
  onClick,
  disabled,
  'aria-disabled': ariaDisabled,
  destructive,
  'aria-keyshortcuts': keyshortcuts,
  children,
}) => {
  const read = readLabel(children);
  const marker = useItem(
    {
      label: read.text.trim(),
      ...(read.icon ? { icon: read.icon } : {}),
      shortcut: read.keys || keyshortcuts || undefined,
      disabled: !!disabled || ariaDisabled === true || ariaDisabled === 'true',
      destructive,
    },
    onClick,
  );
  return <span ref={marker} />;
};

export const DropdownMenuSeparator: React.FC = () => {
  const marker = useItem({ label: '', separator: true });
  return <span ref={marker} />;
};
