import { useId } from 'react';
import {
  Button,
  ColorField,
  Inline,
  Label,
  SegmentedControl,
  Stack,
  Switch,
} from '@/shared/ui';

export type DeviceChoice = 'none' | 'phone' | 'tablet' | 'desktop';

const DEVICE_OPTIONS: { value: DeviceChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'phone', label: 'Phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
];

/** The stage behind the artboard and the device frame around it. */
export function StagePanel({
  background,
  checkerboard,
  device,
  onChange,
  onDeviceChange,
}: {
  background: string;
  checkerboard: boolean;
  device: DeviceChoice;
  onChange: (patch: { background?: string; checkerboard?: boolean }) => void;
  onDeviceChange: (device: DeviceChoice) => void;
}) {
  const checkerId = useId();
  return (
    <Stack gap="4">
      <Stack gap="2">
        <ColorField
          label="Background colour"
          value={background}
          onChange={(css) => onChange({ background: css })}
          alpha
          disabled={checkerboard}
        />
        <Inline gap="2" wrap>
          {['transparent', 'white', 'black'].map((c) => (
            <Button
              key={c}
              variant={background === c ? 'primary' : 'secondary'}
              size="sm"
              disabled={checkerboard}
              onClick={() => onChange({ background: c })}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </Inline>
      </Stack>
      <Inline gap="2" align="center">
        <Switch
          id={checkerId}
          checked={checkerboard}
          onCheckedChange={(v) => onChange({ checkerboard: v })}
        />
        <Label htmlFor={checkerId}>Checkerboard (shows transparency)</Label>
      </Inline>
      <Stack gap="2">
        <Label>Device frame</Label>
        <SegmentedControl
          label="Device frame"
          size="sm"
          value={device}
          onChange={onDeviceChange}
          options={DEVICE_OPTIONS}
        />
      </Stack>
    </Stack>
  );
}
