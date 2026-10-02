import React from 'react';
import { Button, Inline } from '@/shared/ui';
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

export const Presets: React.FC<{
  flavour: CronFlavour;
  onPick(expr: string): void;
}> = ({ flavour, onPick }) => (
  <Inline gap="2" wrap role="group" aria-label="Presets">
    {PRESETS.map((p) => (
      <Button
        key={p.label}
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onPick(fromUnix(p.unix, flavour))}
      >
        {p.label}
      </Button>
    ))}
  </Inline>
);
