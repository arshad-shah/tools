import { IconCircleHelp } from '@/shared/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  ShortcutHint,
} from '@/shared/ui';
import { useHelp } from './help-context';

/** The top-bar help menu: keyboard shortcuts and the privacy note. */
export function HelpMenu({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const help = useHelp();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <IconButton
          variant="ghost"
          size={size}
          label="Help"
          icon={IconCircleHelp}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem
          onClick={help.openShortcuts}
          className="justify-between"
        >
          Keyboard shortcuts
          <ShortcutHint keys="?" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={help.openPrivacy}>Privacy</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
