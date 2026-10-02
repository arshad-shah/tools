import React from 'react';
import { Button, Inline, Tooltip } from '@/shared/ui';
import { FLAG_INFO } from '../lib/flags';

interface FlagTogglesProps {
  flags: string;
  onToggle: (letter: string) => void;
}

/**
 * One pressed-state toggle per flag (aria-pressed; selection is never drawn
 * as primary), with its Alt shortcut in the tooltip.
 */
export const FlagToggles: React.FC<FlagTogglesProps> = ({
  flags,
  onToggle,
}) => (
  <Inline gap="1" wrap role="group" aria-label="Flags">
    {FLAG_INFO.map((f) => {
      const on = flags.includes(f.flag);
      return (
        <Tooltip
          key={f.flag}
          content={f.description}
          shortcut={`Alt+${f.flag.toUpperCase()}`}
        >
          <Button
            variant={on ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={on}
            aria-label={`${f.label} (${f.flag})`}
            className="font-mono"
            onClick={() => onToggle(f.flag)}
          >
            {f.flag}
          </Button>
        </Tooltip>
      );
    })}
  </Inline>
);
