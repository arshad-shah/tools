import {
  Card,
  ColorField,
  FileDrop,
  Inline,
  List,
  Notice,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import type { IconFont, IconShape } from '../lib/render';
import type { FaviconSettings } from '../settings';

export type SourceMode = 'image' | 'svg' | 'text';

export interface SvgState {
  text: string;
  /** The sanitised SVG, when `text` parsed. */
  clean: string | null;
  removed: string[];
  error: string | null;
}

export interface SourcePanelProps {
  mode: SourceMode;
  onModeChange(m: SourceMode): void;
  imageName: string | null;
  imageError: string | null;
  onImage(file: File): void;
  svg: SvgState;
  onSvgText(text: string): void;
  onSvgFile(file: File): void;
  text: string;
  onTextChange(t: string): void;
  textError: string | null;
  settings: FaviconSettings;
  update(patch: Partial<FaviconSettings>): void;
}

const FONTS: { value: IconFont; label: string }[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];

function ImageSource(p: SourcePanelProps) {
  return (
    <Stack gap="4">
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        labels={{
          prompt: 'Drop a square image here, or',
          chooseOne: 'Choose image',
        }}
        hint={
          p.imageName ?? 'PNG, JPEG or WebP, at least 512 px for sharp icons'
        }
        onFiles={(f) => f[0] && p.onImage(f[0])}
      />
      {p.imageError ? <Notice tone="danger">{p.imageError}</Notice> : null}
    </Stack>
  );
}

function SvgSource(p: SourcePanelProps) {
  const { svg } = p;
  return (
    <Stack gap="4">
      <TextArea
        label="SVG markup"
        rows={8}
        spellCheck={false}
        placeholder="Paste SVG markup, or open an .svg file below"
        value={svg.text}
        onChange={p.onSvgText}
        error={svg.error ?? undefined}
      />
      <FileDrop
        size="sm"
        accept=".svg,image/svg+xml"
        labels={{
          prompt: 'Drop an .svg file here, or',
          chooseOne: 'Open SVG file',
        }}
        onFiles={(f) => f[0] && p.onSvgFile(f[0])}
      />
      {svg.removed.length ? (
        <Notice tone="warning" title="Removed from the SVG for safety">
          <List
            label="Removed from the SVG"
            size="sm"
            items={svg.removed.map((r, i) => ({ id: `${r}-${i}`, label: r }))}
          />
        </Notice>
      ) : null}
    </Stack>
  );
}

function TextSource({
  text,
  onTextChange,
  textError,
  settings,
  update,
}: SourcePanelProps) {
  return (
    <Stack gap="5">
      <TextField
        label="Text (1 to 3 characters)"
        value={text}
        onChange={onTextChange}
        maxLength={6}
        autoComplete="off"
        error={textError ?? undefined}
      />
      <Select
        label="Font"
        value={settings.font}
        onChange={(v) => update({ font: v as IconFont })}
        options={FONTS}
      />
      <Inline gap="4" wrap>
        <ColorField
          label="Text colour"
          format="hex"
          value={settings.fg}
          onChange={(fg) => update({ fg })}
        />
        <ColorField
          label="Background colour"
          format="hex"
          value={settings.bg}
          onChange={(bg) => update({ bg })}
        />
      </Inline>
      <SegmentedControl
        label="Shape"
        value={settings.shape}
        onChange={(shape) => update({ shape: shape as IconShape })}
        options={[
          { value: 'square', label: 'Square' },
          { value: 'rounded', label: 'Rounded' },
          { value: 'circle', label: 'Circle' },
        ]}
      />
      <Slider
        label="Padding"
        min={0}
        max={0.3}
        step={0.01}
        showValue
        value={settings.padding}
        onChange={(padding) =>
          typeof padding === 'number' && update({ padding })
        }
      />
    </Stack>
  );
}

/** Where the icon comes from: an image, an SVG or 1 to 3 characters. */
export function SourcePanel(p: SourcePanelProps) {
  return (
    <Card as="section" title="Source" headingLevel={2}>
      <Stack gap="5">
        <SegmentedControl
          label="Source"
          value={p.mode}
          onChange={(m) => p.onModeChange(m as SourceMode)}
          options={[
            { value: 'image', label: 'Image' },
            { value: 'svg', label: 'SVG' },
            { value: 'text', label: 'Text' },
          ]}
        />
        {p.mode === 'image' ? <ImageSource {...p} /> : null}
        {p.mode === 'svg' ? <SvgSource {...p} /> : null}
        {p.mode === 'text' ? <TextSource {...p} /> : null}
      </Stack>
    </Card>
  );
}
