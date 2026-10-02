import React from 'react';
import {
  IconBookOpen,
  IconChevronDown,
  IconCodeXml,
  IconLayers,
  IconSendTo,
  IconSettings,
  IconX,
  IconZap,
} from '@/shared/ui/icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Inline,
  ShareButton,
  type ShareControl,
} from '@/shared/ui';

interface RegexToolbarProps {
  share: ShareControl;
  onOpenTemplates(): void;
  cheatSheetOpen: boolean;
  onToggleCheatSheet(): void;
  /** "Copy as JavaScript" needs a valid, non-empty pattern. */
  canCopyJs: boolean;
  onCopyAsJs(): void;
  onLoadSample(): void;
  /** "Use as log format" needs named groups. */
  canUseAsLogFormat: boolean;
  onUseAsLogFormat(): void;
  onClearAll(): void;
}

const Item: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick(): void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <DropdownMenuItem onClick={onClick} disabled={disabled}>
    <Inline align="center" gap="2">
      {icon}
      <span>{label}</span>
    </Inline>
  </DropdownMenuItem>
);

/** Templates, cheat sheet, Share and the Actions menu. */
export const RegexToolbar: React.FC<RegexToolbarProps> = ({
  share,
  onOpenTemplates,
  cheatSheetOpen,
  onToggleCheatSheet,
  canCopyJs,
  onCopyAsJs,
  onLoadSample,
  canUseAsLogFormat,
  onUseAsLogFormat,
  onClearAll,
}) => (
  <Inline justify="between" align="center" gap="2" wrap>
    <Inline gap="2" wrap>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<IconLayers size="sm" />}
        onClick={onOpenTemplates}
      >
        Templates
      </Button>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<IconBookOpen size="sm" />}
        aria-pressed={cheatSheetOpen}
        onClick={onToggleCheatSheet}
      >
        Cheat sheet
      </Button>
    </Inline>
    <Inline gap="2" wrap>
      <ShareButton share={share} />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconSettings size="sm" />}
            rightIcon={<IconChevronDown size="sm" />}
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Item
            icon={<IconCodeXml size="sm" />}
            label="Copy as JavaScript"
            onClick={onCopyAsJs}
            disabled={!canCopyJs}
          />
          <Item
            icon={<IconZap size="sm" />}
            label="Load sample text"
            onClick={onLoadSample}
          />
          <Item
            icon={<IconSendTo size="sm" />}
            label="Use as log format"
            onClick={onUseAsLogFormat}
            disabled={!canUseAsLogFormat}
          />
          <DropdownMenuSeparator />
          <Item
            icon={<IconX size="sm" />}
            label="Clear all"
            onClick={onClearAll}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </Inline>
  </Inline>
);
