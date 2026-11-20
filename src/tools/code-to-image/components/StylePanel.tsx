import {
  Card,
  ColorField,
  Disclosure,
  Grid,
  NumberField,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { GRADIENTS, isHexColor } from '../lib/backgrounds';
import { FONT_SIZES, PADDINGS, WIDTHS } from '../lib/spec';
import { THEMES } from '../lib/themes';
import type { CodeImageSettings } from '../settings';

interface StylePanelProps {
  settings: CodeImageSettings;
  onChange(patch: Partial<CodeImageSettings>): void;
}

const num = (v: number | number[]) => (Array.isArray(v) ? v[0] : v);

/** The look of the image: theme, backdrop, type, frame and size. */
export function StylePanel({ settings: s, onChange }: StylePanelProps) {
  return (
    <Card as="section" title="Style">
      <Stack gap="5">
        <Select
          label="Image theme"
          value={s.theme}
          onChange={(theme) => onChange({ theme })}
          options={THEMES.map((t) => ({
            value: t.id,
            label: t.label,
            group: t.dark ? 'Dark' : 'Light',
          }))}
        />
        <SegmentedControl
          label="Background"
          fullWidth
          value={s.background}
          onChange={(background) => onChange({ background })}
          options={[
            { value: 'gradient', label: 'Gradient' },
            { value: 'solid', label: 'Solid' },
            { value: 'transparent', label: 'Transparent' },
          ]}
        />
        {s.background === 'gradient' ? (
          <Select
            label="Gradient"
            value={s.gradient}
            onChange={(gradient) => onChange({ gradient })}
            options={GRADIENTS.map((g) => ({ value: g.id, label: g.label }))}
          />
        ) : null}
        {s.background === 'solid' ? (
          <ColorField
            label="Background colour"
            format="hex"
            value={s.solid}
            onChange={(v) => isHexColor(v) && onChange({ solid: v })}
          />
        ) : null}
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          <Slider
            label="Font size"
            min={FONT_SIZES.min}
            max={FONT_SIZES.max}
            step={1}
            showValue
            labels={{ value: (v) => `${v} px` }}
            value={s.fontSize}
            onChange={(v) => onChange({ fontSize: num(v) })}
          />
          <Slider
            label="Padding"
            min={PADDINGS.min}
            max={PADDINGS.max}
            step={4}
            showValue
            labels={{ value: (v) => `${v} px` }}
            value={s.padding}
            onChange={(v) => onChange({ padding: num(v) })}
          />
        </Grid>
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          <Switch
            label="Window frame"
            description="Title bar with the title"
            checked={s.chrome}
            onChange={(chrome) => onChange({ chrome })}
          />
          <Switch
            label="Line numbers"
            checked={s.lineNumbers}
            onChange={(lineNumbers) => onChange({ lineNumbers })}
          />
        </Grid>
        {/* Set once and forgotten: the layout options start closed. */}
        <Disclosure summary="Size and layout" variant="line">
          <Stack gap="5">
            <Select
              label="Tab width"
              value={String(s.tabSize)}
              onChange={(v) => onChange({ tabSize: Number(v) })}
              options={[
                { value: '2', label: '2 spaces' },
                { value: '4', label: '4 spaces' },
                { value: '8', label: '8 spaces' },
              ]}
            />
            <Grid columns={{ base: 1, sm: 2 }} gap="4">
              <SegmentedControl
                label="Width"
                fullWidth
                value={s.widthMode}
                onChange={(widthMode) => onChange({ widthMode })}
                options={[
                  { value: 'auto', label: 'Fit code' },
                  { value: 'fixed', label: 'Fixed' },
                ]}
              />
              <SegmentedControl
                label="Long lines"
                fullWidth
                value={s.overflow}
                onChange={(overflow) => onChange({ overflow })}
                options={[
                  { value: 'wrap', label: 'Wrap' },
                  { value: 'clip', label: 'Clip' },
                ]}
              />
            </Grid>
            {s.widthMode === 'fixed' ? (
              <NumberField
                label="Image width"
                unit="px"
                width="sm"
                min={WIDTHS.min}
                max={WIDTHS.max}
                step={10}
                value={s.width}
                onChange={(v) => v !== null && onChange({ width: v })}
              />
            ) : null}
            <SegmentedControl
              label="PNG scale"
              value={String(s.scale)}
              onChange={(v) => onChange({ scale: Number(v) })}
              options={[
                { value: '1', label: '1x' },
                { value: '2', label: '2x' },
                { value: '3', label: '3x' },
              ]}
            />
          </Stack>
        </Disclosure>
      </Stack>
    </Card>
  );
}
