import { useId, useMemo, useState } from 'react';
import { copyText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { IconCopy, IconDownload } from '@/shared/ui/icons';
import {
  Button,
  Code,
  Heading,
  Inline,
  Input,
  Label,
  SegmentedControl,
  Stack,
} from '@/shared/ui';
import {
  exportPalette,
  tokenName,
  type PaletteEntry,
  type PaletteFormat,
} from '../lib/palette-export';

const FORMATS: { value: PaletteFormat; label: string }[] = [
  { value: 'css', label: 'CSS' },
  { value: 'tailwind', label: 'Tailwind' },
  { value: 'json', label: 'JSON' },
  { value: 'svg', label: 'SVG' },
];

const FILE: Record<PaletteFormat, { ext: string; mime: string }> = {
  css: { ext: 'css', mime: 'text/css' },
  tailwind: { ext: 'css', mime: 'text/css' },
  json: { ext: 'json', mime: 'application/json' },
  svg: { ext: 'svg', mime: 'image/svg+xml' },
};

type Source = 'scale' | 'palette';

export interface PaletteExportProps {
  scale: PaletteEntry[];
  /** The working palette (hex). */
  palette: string[];
}

/** The scale or the working palette as CSS, Tailwind, JSON or SVG. */
export function PaletteExport({ scale, palette }: PaletteExportProps) {
  const id = useId();
  const [fmt, setFmt] = useState<PaletteFormat>('css');
  const [source, setSource] = useState<Source>('scale');
  const [name, setName] = useState('brand');
  const from: Source = palette.length ? source : 'scale';
  const text = useMemo(() => {
    const entries =
      from === 'scale'
        ? scale
        : palette.map((color, i) => ({ label: String(i + 1), color }));
    return exportPalette({ name: name || 'palette', entries }, fmt);
  }, [from, scale, palette, name, fmt]);

  const onCopy = async () => {
    try {
      await copyText(text);
      notify.success('Export copied');
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not copy');
    }
  };
  const onDownload = () => {
    const { ext, mime } = FILE[fmt];
    const suffix = fmt === 'tailwind' ? '-theme' : '';
    saveBlob(
      new Blob([text], { type: mime }),
      `${tokenName(name)}${suffix}.${ext}`,
      mime,
    );
  };

  return (
    <Stack gap="3">
      <Heading level={3} size="md">
        Export
      </Heading>
      <Inline gap="3" align="end" wrap>
        <Stack gap="1">
          <Label htmlFor={`${id}-name`}>Token name</Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={setName}
            autoComplete="off"
            spellCheck={false}
          />
        </Stack>
        <SegmentedControl<Source>
          label="Export source"
          size="sm"
          value={from}
          onChange={setSource}
          options={[
            { value: 'scale', label: 'Scale' },
            {
              value: 'palette',
              label: 'Working palette',
              disabled: palette.length === 0,
            },
          ]}
        />
        <SegmentedControl<PaletteFormat>
          label="Export format"
          size="sm"
          value={fmt}
          onChange={setFmt}
          options={FORMATS}
        />
      </Inline>
      <Code block aria-label="Export output">
        {text}
      </Code>
      <Inline gap="2" wrap>
        <Button
          size="sm"
          leftIcon={<IconCopy size="sm" />}
          onClick={() => void onCopy()}
        >
          Copy export
        </Button>
        <Button
          size="sm"
          leftIcon={<IconDownload size="sm" />}
          onClick={onDownload}
        >
          Download export
        </Button>
      </Inline>
    </Stack>
  );
}
