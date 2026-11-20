import {
  ColorField,
  ColorSwatches,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';

export type DeviceChoice = 'none' | 'phone' | 'tablet' | 'desktop';

const DEVICE_OPTIONS: { value: DeviceChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'phone', label: 'Phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
];

const PRESETS = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
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
  return (
    <Stack gap="5">
      <Switch
        label="Checkerboard (shows transparency)"
        checked={checkerboard}
        onChange={(v) => onChange({ checkerboard: v })}
      />
      {/* The colour is hidden, not disabled, while the checkerboard covers it. */}
      {checkerboard ? null : (
        <>
          <ColorField
            label="Background colour"
            value={background}
            onChange={(css) => onChange({ background: css })}
            alpha
          />
          <ColorSwatches
            label="Background presets"
            size="sm"
            swatches={PRESETS}
            value={background}
            onChange={(c) =>
              onChange({
                background: PRESETS.find((p) => p.value === c)?.value ?? c,
              })
            }
          />
        </>
      )}
      <Stack gap="2">
        <Text size="sm" weight="medium">
          Device frame
        </Text>
        <SegmentedControl
          label="Device frame"
          size="sm"
          fullWidth
          value={device}
          onChange={(v) => onDeviceChange(v as DeviceChoice)}
          options={DEVICE_OPTIONS}
        />
      </Stack>
    </Stack>
  );
}
