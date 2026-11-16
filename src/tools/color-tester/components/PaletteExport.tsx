import {
  Button,
  CodeBlock,
  Grid,
  Heading,
  SegmentedControl,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
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
    <Stack gap="4">
      <Heading level={3} size="sm">
        Export
      </Heading>
      <Grid columns={{ base: 1, md: 3 }} gap="4" align="end">
        <TextField
          label="Token name"
          size="sm"
          value={name}
          onChange={setName}
          autoComplete="off"
          spellCheck={false}
        />
        <SegmentedControl
          label="Export source"
          size="sm"
          fullWidth
          value={from}
          onChange={(v) => setSource(v as Source)}
          options={[
            { value: 'scale', label: 'Scale' },
            {
              value: 'palette',
              label: 'Working palette',
              disabled: palette.length === 0,
            },
          ]}
        />
        <SegmentedControl
          label="Export format"
          size="sm"
          fullWidth
          value={fmt}
          onChange={(v) => setFmt(v as PaletteFormat)}
          options={FORMATS}
        />
      </Grid>
      <CodeBlock
        title="Export output"
        code={text}
        language={fmt === 'json' ? 'json' : fmt === 'svg' ? 'xml' : 'css'}
        copyable
        labels={{ copy: 'Copy export' }}
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={download}
            onClick={onDownload}
          >
            Download export
          </Button>
        }
      />
    </Stack>
  );
}
