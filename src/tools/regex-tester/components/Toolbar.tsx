import { Button, IconButton, Inline, Menu } from '@arshad-shah/cynosure';
import { bookOpen, layers, moreHorizontal } from '@arshad-shah/cynosure/icons';

interface RegexToolbarProps {
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

/**
 * The Pattern card's header actions: Templates, the cheat sheet and a More
 * menu for the rarer actions. Share is in the page header.
 */
export function RegexToolbar({
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
    <Inline gap="1" align="center">
      <Button size="sm" variant="ghost" icon={layers} onClick={onOpenTemplates}>
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
        label="More actions"
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
          <Button {...props} size="sm" variant="ghost" icon={moreHorizontal}>
            More
          </Button>
        )}
      />
    </Inline>
  );
}
