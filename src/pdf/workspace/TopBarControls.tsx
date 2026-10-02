import { useState } from 'react';
import {
  IconLayoutFocus,
  IconLayoutStandard,
  IconLock,
  IconMenu,
  IconMoreHorizontal,
  IconPanelLeft,
  IconRedo,
  IconSearch,
  IconUndo,
  IconDownload,
} from '@/shared/ui/icons';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  ShortcutHint,
  StatusDot,
  Switch,
  Tooltip,
} from '@/shared/ui';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'off' | 'unavailable';

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
  /** Compact: opens the Pages drawer. Standard: shows or hides the rail. */
  onOpenPages(): void;
  /** Standard: whether the rail is shown (the toggle's pressed state). */
  railOpen?: boolean;
  save: SaveStatus;
  /** Encrypted inputs: autosave is opt-in (spec §6.6). */
  canToggleSave: boolean;
  onToggleSave(on: boolean): void;
  restricted: boolean;
  onUnlock(): void;
  onSearch(): void;
  onExport(): void;
}

const SAVE_TEXT: Record<SaveStatus, string> = {
  saved: 'Saved on this device',
  saving: 'Saving',
  error: 'Not saved: storage problem',
  off: 'Not saved locally',
  unavailable: 'Not saved locally',
};
const SAVE_TONE = {
  saved: 'accent',
  saving: 'info',
  error: 'danger',
  off: 'muted',
  unavailable: 'muted',
} as const;

/** Filename field that renames on Enter or blur. */
function NameField({
  name,
  onRename,
  narrow,
}: {
  name: string;
  onRename(n: string): void;
  narrow?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim()) onRename(draft.trim());
    setDraft(null);
  };
  return (
    <div className={narrow ? 'w-24 min-w-0' : 'w-40 min-w-0 sm:w-56'}>
      <Input
        aria-label="Document name"
        value={draft ?? name}
        onChange={setDraft}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') setDraft(null);
        }}
      />
    </div>
  );
}

/** The workspace top bar's centre and actions (spec §6.1). */
export function TopBarControls(p: TopBarControlsProps) {
  const undo = p.undoLabel ? `Undo ${p.undoLabel}` : 'Nothing to undo';
  const redo = p.redoLabel ? `Redo ${p.redoLabel}` : 'Nothing to redo';
  const saveText = SAVE_TEXT[p.save];
  const phone = p.layout === 'phone';
  // Focus and phone are touch layouts: 44px targets (spec §13.2).
  const size = p.compact ? 'lg' : 'md';
  const undoButton = (
    <Tooltip content={undo} shortcut="Mod+Z">
      <IconButton
        variant="ghost"
        size={size}
        label={undo}
        icon={IconUndo}
        aria-disabled={!p.undoLabel}
        onClick={() => p.undoLabel && p.onUndo()}
      />
    </Tooltip>
  );
  const redoButton = (
    <Tooltip content={redo} shortcut="Mod+Shift+Z">
      <IconButton
        variant="ghost"
        size={size}
        label={redo}
        icon={IconRedo}
        aria-disabled={!p.redoLabel}
        onClick={() => p.redoLabel && p.onRedo()}
      />
    </Tooltip>
  );
  const exportButton = phone ? (
    <IconButton
      variant="primary"
      size="lg"
      label="Export"
      icon={IconDownload}
      onClick={p.onExport}
    />
  ) : (
    <Button
      variant="primary"
      size={p.compact ? 'lg' : 'md'}
      onClick={p.onExport}
      leftIcon={<IconDownload size="sm" />}
      rightIcon={p.compact ? undefined : <ShortcutHint keys="Mod+S" />}
    >
      Export
    </Button>
  );
  const restricted = p.restricted ? (
    <Button
      variant="secondary"
      size={p.compact ? 'lg' : 'sm'}
      onClick={p.onUnlock}
      leftIcon={<IconLock size="sm" />}
    >
      <Badge tone="warning" variant="soft">
        Restricted
      </Badge>
      <span className="sr-only">Enter the owner password to edit</span>
    </Button>
  ) : null;

  if (p.compact)
    return (
      <div className="flex min-w-0 items-center justify-end gap-1">
        <NameField name={p.name} onRename={p.onRename} narrow={phone} />
        {restricted}
        {undoButton}
        {phone ? null : redoButton}
        <IconButton
          variant="ghost"
          size={size}
          label="Pages"
          icon={IconMenu}
          onClick={p.onOpenPages}
        />
        {exportButton}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <IconButton
              variant="ghost"
              size={size}
              label="More"
              icon={IconMoreHorizontal}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {phone ? (
              <DropdownMenuItem
                aria-disabled={!p.redoLabel}
                onClick={() => p.redoLabel && p.onRedo()}
              >
                {redo}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={p.onSearch}>
              Search tools and actions
            </DropdownMenuItem>
            {p.layout !== 'phone' ? (
              <DropdownMenuItem onClick={p.onToggleFocus}>
                Standard layout
              </DropdownMenuItem>
            ) : null}
            {p.canToggleSave ? (
              <DropdownMenuItem
                onClick={() => p.onToggleSave(p.save === 'off')}
              >
                {p.save === 'off'
                  ? 'Save on this device'
                  : 'Stop saving on this device'}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <StatusDot tone={SAVE_TONE[p.save]} label={saveText} />
      </div>
    );

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
      <NameField name={p.name} onRename={p.onRename} />
      {restricted}
      <Button
        variant="secondary"
        size="sm"
        onClick={p.onSearch}
        leftIcon={<IconSearch size="sm" />}
        rightIcon={<ShortcutHint keys="Mod+K" />}
        className="text-fg-muted"
      >
        Search
      </Button>
      {undoButton}
      {redoButton}
      <Tooltip content="Page rail" shortcut="Mod+\\">
        <IconButton
          variant="ghost"
          label="Page rail"
          icon={IconPanelLeft}
          aria-pressed={!!p.railOpen}
          onClick={p.onOpenPages}
        />
      </Tooltip>
      <Tooltip content="Focus layout" shortcut="F">
        <IconButton
          variant="ghost"
          label="Focus layout"
          icon={p.layout === 'focus' ? IconLayoutStandard : IconLayoutFocus}
          aria-pressed={p.layout === 'focus'}
          onClick={p.onToggleFocus}
        />
      </Tooltip>
      <span className="flex items-center gap-2 text-sm text-fg-muted">
        <StatusDot tone={SAVE_TONE[p.save]} decorative />
        {/* Read by screen readers at every width; shown from lg up. */}
        <span className="sr-only lg:not-sr-only">{saveText}</span>
        {p.canToggleSave ? (
          <Switch
            checked={p.save !== 'off'}
            onCheckedChange={p.onToggleSave}
            aria-label="Save on this device"
          />
        ) : null}
      </span>
      {exportButton}
    </div>
  );
}
