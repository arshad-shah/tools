import React from 'react';
import {
  Inline,
  Label,
  NumberInput,
  OptionsMenu,
  SegmentedControl,
  Stack,
  SwitchField,
} from '@/shared/ui';
import type { CalculatorSettings } from '../settings';

type Patch = Partial<
  Pick<CalculatorSettings, 'angle' | 'precision' | 'bigNumber' | 'thousands'>
>;

interface SheetSettingsProps {
  settings: CalculatorSettings;
  onChange(patch: Patch): void;
}

const DEFAULT_PRECISION = 14;

/**
 * Angle unit up front (it changes answers often); significant digits, exact
 * decimals and digit grouping behind the Options button.
 */
export const SheetSettings: React.FC<SheetSettingsProps> = ({
  settings,
  onChange,
}) => {
  const changed =
    Number(settings.precision !== DEFAULT_PRECISION) +
    Number(settings.bigNumber) +
    Number(settings.thousands);
  return (
    <Inline gap="2" align="center">
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
      <OptionsMenu title="Calculator options" changed={changed}>
        <Stack gap="1">
          <Label htmlFor="calc-precision">Significant digits</Label>
          <NumberInput
            id="calc-precision"
            min={4}
            max={64}
            value={settings.precision}
            onValueChange={(precision) =>
              Number.isFinite(precision) && onChange({ precision })
            }
          />
        </Stack>
        <SwitchField
          id="calc-bignumber"
          label="Exact decimals"
          description="BigNumber arithmetic: 0.1 + 0.2 is exactly 0.3"
          checked={settings.bigNumber}
          onCheckedChange={(bigNumber) => onChange({ bigNumber })}
        />
        <SwitchField
          id="calc-thousands"
          label="Thousands separators"
          checked={settings.thousands}
          onCheckedChange={(thousands) => onChange({ thousands })}
        />
      </OptionsMenu>
    </Inline>
  );
};
