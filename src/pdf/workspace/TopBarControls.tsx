import {
  Badge,
  Button,
  IconButton,
  Inline,
  Kbd,
  Menu,
  TextField,
  Tooltip,
} from '@arshad-shah/cynosure';
import {
  download,
  layoutFocus,
  layoutWorkspace,
  lock,
  moreHorizontal,
  redo as redoIcon,
  search,
  sidebar,
  undo as undoIcon,
} from '@arshad-shah/cynosure/icons';
import { useState, type ReactElement, type ReactNode } from 'react';
import { hotkeyCaps } from '@/shared/lib/hotkeys';

import { SAVE_TEXT, SAVE_TONE, type SaveStatus } from './save-status';

export type { SaveStatus } from './save-status';

export interface TopBarControlsProps {
  compact: boolean;
  name: string;
  onRename(name: string): void;
  undoLabel: string | null;
  redoLabel: string | null;
  onUndo(): void;
  onRedo(): void;
  layout: 'standard' | 'focus' | 'phone';
  onToggleFocus(): void;
  /** Compact: opens the Pages sheet. Standard: shows or hides the rail. */
  onOpenPages(): void;
  /** Standard: whether the rail is shown (the toggle's pressed state). */
  railOpen?: boolean;
  save: SaveStatus;
  /** Encrypted inputs: autosave is opt-in (spec §6.6). */
  canToggleSave: boolean;
  onToggleSave(on: boolean): void;
  restricted: boolean;
  onUnlock(): void;
  /** Document status (the "Signed" button). */
  badges?: ReactNode;
  onSearch(): void;
  onExport(): void;
  /** The app's help menu (keyboard shortcuts, privacy), at the bar's size. */
  helpMenu?: (size: 'md' | 'lg') => ReactNode;
  /** Workspace settings actions (e.g. "Clear trusted roots") in More. */
  settingsItems?: TopBarMenuItem[];
}

export interface TopBarMenuItem {
  id: string;
  label: string;
  onSelect(): void;
}

/** Filename field that renames on Enter or blur; Escape cancels. */
function NameField({
  name,
  onRename,
  touch,
}: {
  name: string;
  onRename(n: string): void;
  touch?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim()) onRename(draft.trim());
    setDraft(null);
  };
  return (
    <TextField
      label="Document name"
      labelHidden
      size={touch ? 'lg' : 'sm'}
      width="sm"
      value={draft ?? name}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          // Cancels the edit only: the workspace's Escape skips handled keys.
          e.preventDefault();
          setDraft(null);
        }
      }}
    />
  );
}

/** A shortcut after a name in a tooltip: "Undo rotate page 3  Ctrl Z". */
function Tip({
  text,
  keys,
  children,
}: {
  text: string;
  keys?: string;
  children: ReactElement<Record<string, unknown>>;
}) {
  return (
    <Tooltip
      content={
        <Inline gap="2" align="center">
          {text}
          {keys ? <Kbd keys={hotkeyCaps(keys)} size="sm" /> : null}
        </Inline>
      }
    >
      {children}
    </Tooltip>
  );
}

/** The workspace header's document controls and actions (spec §6.1). */
export function TopBarControls(p: TopBarControlsProps) {
  const undo = p.undoLabel ? `Undo ${p.undoLabel}` : 'Nothing to undo';
  const redo = p.redoLabel ? `Redo ${p.redoLabel}` : 'Nothing to redo';
  const saveText = SAVE_TEXT[p.save];
  const phone = p.layout === 'phone';
  // Focus and phone are touch layouts: large controls (spec §13.2).
  const size = p.compact ? 'lg' : 'sm';
  const restricted = p.restricted ? (
    <Button
      variant="soft"
      tone="warning"
      size={size}
      icon={lock}
      aria-label="Restricted: enter the owner password to edit"
      onClick={p.onUnlock}
    >
      Restricted
    </Button>
  ) : null;

  if (p.compact) {
    const more = [
      ...(phone
        ? [{ value: 'redo', label: redo, disabled: !p.redoLabel }]
        : []),
      { value: 'search', label: 'Search tools and actions', icon: search },
      ...(phone
        ? []
        : [
            {
              value: 'layout',
              label: 'Standard layout',
              icon: layoutWorkspace,
            },
          ]),
      ...(p.canToggleSave
        ? [
            {
              value: 'save',
              label:
                p.save === 'off'
                  ? 'Save on this device'
                  : 'Stop saving on this device',
            },
          ]
        : []),
      ...(p.settingsItems ?? []).map((i) => ({ value: i.id, label: i.label })),
    ];
    return (
      <Inline gap="1" align="center" justify="end" grow minSize="0">
        <NameField name={p.name} onRename={p.onRename} touch />
        {restricted}
        {p.badges}
        <IconButton
          variant="ghost"
          size="lg"
          icon={undoIcon}
          label={undo}
          disabled={!p.undoLabel}
          onClick={p.onUndo}
        />
        {phone ? null : (
          <IconButton
            variant="ghost"
            size="lg"
            icon={redoIcon}
            label={redo}
            disabled={!p.redoLabel}
            onClick={p.onRedo}
          />
        )}
        <IconButton
          variant="ghost"
          size="lg"
          icon={sidebar}
          label="Pages"
          onClick={p.onOpenPages}
        />
        {p.helpMenu?.('lg')}
        {phone ? (
          <IconButton
            variant="solid"
            tone="accent"
            size="lg"
            icon={download}
            label="Export"
            onClick={p.onExport}
          />
        ) : (
          <Button
            variant="solid"
            tone="accent"
            size="lg"
            icon={download}
            onClick={p.onExport}
          >
            Export
          </Button>
        )}
        <Menu
          label="More"
          items={more}
          onSelect={(v) => {
            if (v === 'redo') p.onRedo();
            else if (v === 'search') p.onSearch();
            else if (v === 'layout') p.onToggleFocus();
            else if (v === 'save') p.onToggleSave(p.save === 'off');
            else p.settingsItems?.find((i) => i.id === v)?.onSelect();
          }}
          trigger={(t) => (
            <IconButton
              {...t}
              variant="ghost"
              size="lg"
              label="More"
              icon={moreHorizontal}
            />
          )}
        />
        <Badge tone={SAVE_TONE[p.save]} dot label={saveText} />
      </Inline>
    );
  }

  return (
    <Inline gap="2" align="center" justify="end" grow minSize="0">
      <NameField name={p.name} onRename={p.onRename} />
      {restricted}
      {p.badges}
      <Inline gap="1" align="center">
        <Tip text={undo} keys="Mod+Z">
          <Button
            variant="ghost"
            size="sm"
            icon={undoIcon}
            aria-label={undo}
            disabled={!p.undoLabel}
            onClick={p.onUndo}
          >
            Undo
          </Button>
        </Tip>
        <Tip text={redo} keys="Mod+Shift+Z">
          <Button
            variant="ghost"
            size="sm"
            icon={redoIcon}
            aria-label={redo}
            disabled={!p.redoLabel}
            onClick={p.onRedo}
          >
            Redo
          </Button>
        </Tip>
      </Inline>
      <Inline gap="1" align="center">
        <Tip text="Page rail" keys="Mod+\\">
          <Button
            variant={p.railOpen ? 'soft' : 'ghost'}
            tone={p.railOpen ? 'accent' : 'neutral'}
            size="sm"
            icon={sidebar}
            aria-label="Page rail"
            pressed={!!p.railOpen}
            onClick={p.onOpenPages}
          >
            Pages
          </Button>
        </Tip>
        <Tip text="Focus layout" keys="F">
          <Button
            variant="ghost"
            size="sm"
            icon={p.layout === 'focus' ? layoutWorkspace : layoutFocus}
            aria-label="Focus layout"
            pressed={p.layout === 'focus'}
            onClick={p.onToggleFocus}
          >
            Focus
          </Button>
        </Tip>
        <Tip text="Search tools and actions" keys="Mod+K">
          <IconButton
            variant="ghost"
            size="sm"
            icon={search}
            label="Search"
            onClick={p.onSearch}
          />
        </Tip>
      </Inline>
      {p.helpMenu?.('md')}
      <Tip text="Export" keys="Mod+S">
        <Button
          variant="solid"
          tone="accent"
          size="sm"
          icon={download}
          onClick={p.onExport}
        >
          Export
        </Button>
      </Tip>
    </Inline>
  );
}
