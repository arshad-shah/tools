import {
  Button,
  Divider,
  DockedToolbar,
  IconButton,
  Inline,
  Menu,
  ScrollArea,
  Stack,
  Toolbar,
} from '@arshad-shah/cynosure';
import { chevronDown } from '@arshad-shah/cynosure/icons';
import {
  Fragment,
  useContext,
  type KeyboardEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import { ModeToolbarContext } from './mode-toolbar-context';
import { useDockedBarOpen } from './ui/docked-bars';
import type { ToolGroup, ToolItem } from './ui/tool-groups';

export type { ToolGroup, ToolItem } from './ui/tool-groups';

/** "Mod+Shift+Z" as aria-keyshortcuts ("Control+Shift+Z"). */
const ariaKeys = (shortcut?: string) =>
  shortcut
    ?.split(' ')[0]
    .replace(/\bMod\b/g, 'Control')
    .replace(/\bDelete\b/, 'Delete');

/** The name a tool is known by: its label, with the reason it is off. */
const nameOf = (item: ToolItem) =>
  typeof item.disabled === 'string'
    ? `${item.label} (${item.disabled})`
    : item.label;

function setRef<T>(ref: Ref<T> | undefined, el: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') ref(el);
  else (ref as { current: T | null }).current = el;
}

/**
 * One tool: a labelled Button where the bar shows labels (Standard), an
 * IconButton (its name as the tooltip) in the Focus palette and on phones.
 * Split items add a menu button beside them; menu items open their menu.
 */
function ToolButton({
  item,
  labelled,
  touch,
  vertical,
}: {
  item: ToolItem;
  labelled: boolean;
  touch: boolean;
  vertical: boolean;
}) {
  const disabled = Boolean(item.disabled);
  const pressed =
    item.kind === 'toggle' ||
    (item.kind === 'split' && item.pressed !== undefined)
      ? Boolean(item.pressed)
      : undefined;
  const size = touch ? 'lg' : 'sm';
  const look = {
    variant: pressed ? ('soft' as const) : ('ghost' as const),
    tone: pressed ? ('accent' as const) : ('neutral' as const),
  };
  const render = (
    extra: {
      ref?: Ref<HTMLButtonElement>;
      onClick?: () => void;
      onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
      'aria-expanded'?: boolean;
      'aria-controls'?: string;
      'aria-haspopup'?: 'menu';
    } = {},
  ) => {
    const ref = (el: HTMLButtonElement | null) => {
      setRef(item.anchor, el);
      setRef(extra.ref, el);
    };
    const common = {
      ...look,
      size,
      disabled,
      pressed,
      'aria-keyshortcuts': ariaKeys(item.shortcut),
      'aria-expanded': extra['aria-expanded'],
      'aria-controls': extra['aria-controls'],
      'aria-haspopup': extra['aria-haspopup'],
      onKeyDown: extra.onKeyDown,
      onClick: extra.onClick ?? (() => item.onSelect?.()),
    } as const;
    return labelled ? (
      <Button
        ref={ref}
        {...common}
        icon={item.icon}
        iconEnd={item.kind === 'menu' ? chevronDown : undefined}
        aria-label={
          nameOf(item) === (item.shortLabel ?? item.label)
            ? undefined
            : nameOf(item)
        }
      >
        {item.shortLabel ?? item.label}
      </Button>
    ) : (
      <IconButton
        ref={ref}
        {...common}
        icon={item.icon}
        label={nameOf(item)}
        tooltipPlacement={vertical ? 'end' : 'top'}
      />
    );
  };
  const entries = (item.menu ?? []).map((m) => ({
    value: m.id,
    label: m.label,
  }));
  const choose = (value: string) =>
    item.menu?.find((m) => m.id === value)?.onSelect();
  if (item.kind === 'menu' && !disabled)
    return (
      <Menu
        label={item.label}
        items={entries}
        onSelect={choose}
        trigger={(t) => render(t)}
      />
    );
  if (item.kind !== 'split') return render();
  const Pair = vertical ? Stack : Inline;
  return (
    <Pair gap="0" align="center">
      {render()}
      <Menu
        label={item.label}
        items={entries}
        onSelect={choose}
        trigger={(t) => (
          <IconButton
            {...t}
            icon={chevronDown}
            label={`${item.label} options`}
            variant="ghost"
            size={size}
            disabled={disabled}
          />
        )}
      />
    </Pair>
  );
}

function Groups({
  groups,
  labelled,
  touch,
  vertical,
}: {
  groups: ToolGroup[];
  labelled: boolean;
  touch: boolean;
  vertical: boolean;
}) {
  const Box = vertical ? Stack : Inline;
  return (
    <>
      {groups.map((g, i) => (
        <Fragment key={g.id}>
          {i > 0 ? (
            <Divider
              orientation={vertical ? 'horizontal' : 'vertical'}
              spacing="sm"
            />
          ) : null}
          <Box gap="1" align="center" role="group" aria-label={g.label}>
            {g.items.map((item) => (
              <ToolButton
                key={item.id}
                item={item}
                labelled={labelled}
                touch={touch}
                vertical={vertical}
              />
            ))}
          </Box>
        </Fragment>
      ))}
    </>
  );
}

/**
 * What a mode's Toolbar component renders: the same groups become the
 * Standard toolbar (one labelled row that scrolls sideways), the Focus
 * palette docked to a side, or the phone bar docked at the bottom.
 */
export function ModeToolbar({
  groups,
  trailing,
}: {
  groups: ToolGroup[];
  /** Custom controls and status after the tools (every layout). */
  trailing?: ReactNode;
}) {
  const s = useContext(ModeToolbarContext);
  // A contextual bar docked at the bottom (phone) takes this place.
  const away = useDockedBarOpen();
  if (s.layout === 'focus')
    return (
      <DockedToolbar
        label={s.label}
        edge={s.palette === 'left' ? 'start' : 'end'}
        onEdgeChange={(edge) =>
          s.onPaletteChange(edge === 'start' ? 'left' : 'right')
        }
        trailing={trailing}
      >
        <Groups groups={groups} labelled={false} touch vertical />
      </DockedToolbar>
    );
  if (s.layout === 'phone')
    return (
      <DockedToolbar label={s.label} trailing={trailing} open={!away}>
        <Groups groups={groups} labelled={false} touch vertical={false} />
      </DockedToolbar>
    );
  return (
    <Inline gap="2" align="center" grow minSize="0">
      <ScrollArea direction="horizontal">
        <Toolbar label={s.label}>
          <Inline gap="1" align="center">
            <Groups groups={groups} labelled touch={false} vertical={false} />
          </Inline>
        </Toolbar>
      </ScrollArea>
      {trailing ? (
        <Inline gap="2" align="center">
          {trailing}
        </Inline>
      ) : null}
    </Inline>
  );
}
