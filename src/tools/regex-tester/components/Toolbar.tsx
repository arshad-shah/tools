import { Button, IconButton, Inline, Menu } from '@arshad-shah/cynosure';
import {
  bookOpen,
  layers,
  share as shareIcon,
  sliders,
} from '@arshad-shah/cynosure/icons';
import type { ShareControl } from '@/shared/ui';

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

/** Templates, the cheat sheet, the Actions menu and Share. */
export function RegexToolbar({
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
}: RegexToolbarProps) {
  return (
    <Inline gap="2" wrap>
      <Button size="sm" variant="soft" icon={layers} onClick={onOpenTemplates}>
        Templates
      </Button>
      <IconButton
        size="sm"
        variant={cheatSheetOpen ? 'soft' : 'ghost'}
        icon={bookOpen}
        label="Cheat sheet"
        aria-pressed={cheatSheetOpen}
        onClick={onToggleCheatSheet}
      />
      <Menu
        label="Actions"
        items={[
          {
            items: [
              {
                value: 'js',
                label: 'Copy as JavaScript',
                disabled: !canCopyJs,
              },
              { value: 'sample', label: 'Load sample text' },
              {
                value: 'log',
                label: 'Use as log format',
                disabled: !canUseAsLogFormat,
              },
            ],
          },
          { items: [{ value: 'clear', label: 'Clear all', tone: 'danger' }] },
        ]}
        onSelect={(v) => {
          if (v === 'js') onCopyAsJs();
          else if (v === 'sample') onLoadSample();
          else if (v === 'log') onUseAsLogFormat();
          else if (v === 'clear') onClearAll();
        }}
        trigger={(props) => (
          <Button {...props} size="sm" variant="soft" icon={sliders}>
            Actions
          </Button>
        )}
      />
      <Button
        size="sm"
        variant="ghost"
        icon={shareIcon}
        disabled={!share.canShare}
        onClick={() => void Promise.resolve(share.share()).catch(() => {})}
      >
        Share
      </Button>
    </Inline>
  );
}
