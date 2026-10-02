import { useId } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ColorField,
  DropZone,
  Inline,
  Input,
  Label,
  List,
  ListItem,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
import { IconFileCode, IconImage } from '@/shared/ui/icons';
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
    <Stack gap="2">
      <DropZone
        variant="inline"
        multiple={false}
        accept="image/png,image/jpeg,image/webp"
        icon={IconImage}
        title={p.imageName ?? 'Drop a square image'}
        hint="PNG, JPEG or WebP, at least 512 px for sharp icons"
        chooseLabel="Choose image"
        onFiles={(f) => f[0] && p.onImage(f[0])}
      />
      {p.imageError ? (
        <Alert status="danger">
          <AlertDescription>{p.imageError}</AlertDescription>
        </Alert>
      ) : null}
    </Stack>
  );
}

function SvgSource(p: SourcePanelProps) {
  const id = useId();
  const { svg } = p;
  return (
    <Stack gap="2">
      <DropZone
        variant="inline"
        multiple={false}
        accept=".svg,image/svg+xml"
        icon={IconFileCode}
        title="Drop an SVG file"
        chooseLabel="Choose SVG"
        onFiles={(f) => f[0] && p.onSvgFile(f[0])}
      />
      <Label htmlFor={id}>Or paste SVG markup</Label>
      <Textarea
        id={id}
        rows={6}
        value={svg.text}
        onChange={p.onSvgText}
        invalid={!!svg.error}
        spellCheck={false}
        placeholder="<svg xmlns=...>"
      />
      {svg.error ? (
        <Alert status="danger">
          <AlertDescription>{svg.error}</AlertDescription>
        </Alert>
      ) : null}
      {svg.removed.length > 0 ? (
        <Alert status="warning">
          <AlertTitle>Removed from the SVG for safety</AlertTitle>
          <List aria-label="Removed from the SVG">
            {svg.removed.map((r, i) => (
              <ListItem key={`${r}-${i}`}>{r}</ListItem>
            ))}
          </List>
        </Alert>
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
  const textId = useId();
  const fontId = useId();
  const padId = useId();
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Label htmlFor={textId}>Text (1 to 3 characters)</Label>
        <Input
          id={textId}
          value={text}
          onChange={onTextChange}
          maxLength={6}
          invalid={!!textError}
          aria-describedby={textError ? `${textId}-error` : undefined}
          autoComplete="off"
        />
        {textError ? (
          <Text id={`${textId}-error`} size="xs" className="text-danger">
            {textError}
          </Text>
        ) : null}
      </Stack>
      <Stack gap="1">
        <Label htmlFor={fontId}>Font</Label>
        <Select
          id={fontId}
          value={settings.font}
          onValueChange={(v) => update({ font: v as IconFont })}
          items={FONTS}
        />
      </Stack>
      <Inline gap="3" wrap>
        <ColorField
          label="Text colour"
          value={settings.fg}
          onChange={(fg) => update({ fg })}
          defaultFormat="hex"
        />
        <ColorField
          label="Background colour"
          value={settings.bg}
          onChange={(bg) => update({ bg })}
          defaultFormat="hex"
        />
      </Inline>
      <SegmentedControl<IconShape>
        label="Shape"
        value={settings.shape}
        onChange={(shape) => update({ shape })}
        options={[
          { value: 'square', label: 'Square' },
          { value: 'rounded', label: 'Rounded' },
          { value: 'circle', label: 'Circle' },
        ]}
      />
      <Stack gap="1">
        <Label htmlFor={padId}>
          Padding {Math.round(settings.padding * 100)}%
        </Label>
        <Slider
          id={padId}
          min={0}
          max={0.3}
          step={0.01}
          value={settings.padding}
          onValueChange={(padding) => update({ padding })}
        />
      </Stack>
    </Stack>
  );
}

/** Where the icon comes from: an image, an SVG or 1 to 3 characters. */
export function SourcePanel(p: SourcePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">Source</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <SegmentedControl<SourceMode>
            label="Source"
            value={p.mode}
            onChange={p.onModeChange}
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
      </CardBody>
    </Card>
  );
}
