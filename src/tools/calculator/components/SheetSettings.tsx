import React from 'react';
import {
  Inline,
  Label,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
} from '@/shared/ui';
import type { CalculatorSettings } from '../settings';

type Patch = Partial<
  Pick<CalculatorSettings, 'angle' | 'precision' | 'bigNumber' | 'thousands'>
>;

interface SheetSettingsProps {
  settings: CalculatorSettings;
  onChange(patch: Patch): void;
}

/** Angle unit, significant digits, exact decimals and digit grouping. */
export const SheetSettings: React.FC<SheetSettingsProps> = ({
  settings,
  onChange,
}) => (
  <Inline gap="4" wrap align="end">
    <SegmentedControl
      label="Angle unit"
      size="sm"
      value={settings.angle}
      onChange={(angle) => onChange({ angle })}
      options={[
        { value: 'deg', label: 'Degrees' },
        { value: 'rad', label: 'Radians' },
      ]}
    />
    <Stack gap="1">
      <Label htmlFor="calc-precision">Significant digits</Label>
      <NumberInput
        id="calc-precision"
        className="w-32"
        min={4}
        max={64}
        value={settings.precision}
        onValueChange={(precision) =>
          Number.isFinite(precision) && onChange({ precision })
        }
      />
    </Stack>
    <Inline gap="2" align="center">
      <Switch
        id="calc-bignumber"
        checked={settings.bigNumber}
        onCheckedChange={(bigNumber) => onChange({ bigNumber })}
      />
      <Label htmlFor="calc-bignumber">Exact decimals (BigNumber)</Label>
    </Inline>
    <Inline gap="2" align="center">
      <Switch
        id="calc-thousands"
        checked={settings.thousands}
        onCheckedChange={(thousands) => onChange({ thousands })}
      />
      <Label htmlFor="calc-thousands">Thousands separators</Label>
    </Inline>
  </Inline>
);
