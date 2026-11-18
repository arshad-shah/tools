import { Button, Menu } from '@arshad-shah/cynosure';
import { chevronDown } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { fromUnix } from '../lib/flavour';
import type { CronFlavour } from '../lib/parse';

/** Common schedules, written in Unix form and carried to the flavour. */
const PRESETS = [
  { label: 'Every 5 minutes', unix: '*/5 * * * *' },
  { label: 'Hourly', unix: '0 * * * *' },
  { label: 'Daily at midnight', unix: '0 0 * * *' },
  { label: 'Weekdays at 9', unix: '0 9 * * 1-5' },
  { label: 'Weekly on Sunday', unix: '0 0 * * 0' },
  { label: 'First of month', unix: '0 0 1 * *' },
] as const;

/** Common schedules in one menu, for the Expression card's header. */
export const Presets: React.FC<{
  flavour: CronFlavour;
  onPick(expr: string): void;
}> = ({ flavour, onPick }) => (
  <Menu
    label="Presets"
    placement="bottom"
    align="end"
    items={PRESETS.map((p) => ({ value: p.unix, label: p.label }))}
    onSelect={(unix) => onPick(fromUnix(unix, flavour))}
    trigger={(props) => (
      <Button {...props} size="sm" variant="ghost" iconEnd={chevronDown}>
        Presets
      </Button>
    )}
  />
);
