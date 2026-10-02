import { useRef, useState } from 'react';
import { useTheme, type ThemePreference } from '@/shared/lib/theme';
import { IconMonitor, IconMoon, IconSun } from '@/shared/ui/icons';
import { IconButton, Popover, SegmentedControl } from '@/shared/ui';

const ICON = { system: IconMonitor, light: IconSun, dark: IconMoon } as const;

/**
 * Theme switch in the top bar. A popover, not a role=menu dropdown: a
 * radiogroup is not a valid menu child.
 */
export function ThemeMenu() {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <IconButton
        ref={anchor}
        variant="ghost"
        label="Theme"
        aria-haspopup="dialog"
        aria-expanded={open}
        icon={ICON[preference]}
        onClick={() => setOpen((o) => !o)}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        side="bottom"
        align="end"
        label="Theme"
        className="p-2"
      >
        <SegmentedControl<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'System', icon: IconMonitor },
            { value: 'light', label: 'Light', icon: IconSun },
            { value: 'dark', label: 'Dark', icon: IconMoon },
          ]}
        />
      </Popover>
    </>
  );
}
