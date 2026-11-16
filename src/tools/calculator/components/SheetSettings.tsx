import {
  Badge,
  Button,
  Inline,
  NumberField,
  Popover,
  SegmentedControl,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { sliders } from '@arshad-shah/cynosure/icons';
import React from 'react';
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
    <Inline gap="2" align="center" wrap>
      <SegmentedControl
        label="Angle unit"
        size="sm"
        value={settings.angle}
        onChange={(angle) => onChange({ angle: angle as 'deg' | 'rad' })}
        options={[
          { value: 'deg', label: 'Degrees' },
          { value: 'rad', label: 'Radians' },
        ]}
      />
      <Popover
        label="Calculator options"
        placement="bottom"
        trigger={(props) => (
          <Button
            {...props}
            size="sm"
            variant="ghost"
            icon={sliders}
            aria-label={changed ? `Options, ${changed} changed` : 'Options'}
          >
            <Inline as="span" gap="2" align="center">
              Options
              {changed ? (
                <Badge size="sm" tone="accent">
                  {changed}
                </Badge>
              ) : null}
            </Inline>
          </Button>
        )}
      >
        <Stack gap="5" padding="4">
          <NumberField
            label="Significant digits"
            min={4}
            max={64}
            value={settings.precision}
            onChange={(precision) =>
              precision !== null &&
              Number.isFinite(precision) &&
              onChange({ precision })
            }
          />
          <Switch
            label="Exact decimals"
            description="BigNumber arithmetic: 0.1 + 0.2 is exactly 0.3"
            checked={settings.bigNumber}
            onChange={(bigNumber) => onChange({ bigNumber })}
          />
          <Switch
            label="Thousands separators"
            checked={settings.thousands}
            onChange={(thousands) => onChange({ thousands })}
          />
        </Stack>
      </Popover>
    </Inline>
  );
};
