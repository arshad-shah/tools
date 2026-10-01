import React, { useCallback, useMemo, useState } from 'react';
import { Droplets } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Slider,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  ANCHOR_OPTIONS,
  selectPages,
  watermark,
  type Anchor,
  type PageSelection,
  type WatermarkContent,
  type WatermarkOptions,
} from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PdfDropzone,
  PdfFileHeader,
  PdfPagePreview,
  ResultFiles,
  usePreviewBytes,
  type ResultFile,
} from '@/pdf/components';
import { useWatermarkSettings, type WatermarkMode } from './store';

const MARGIN = 24;

const PdfWatermarkTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [image, setImage] = useState<LoadedFile | null>(null);
  const [pageMode, setPageMode] = useState<'all' | 'ranges'>('all');
  const [rangeText, setRangeText] = useState('');
  const s = useWatermarkSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const content = useMemo<WatermarkContent | null>(() => {
    if (s.mode === 'text')
      return {
        kind: 'text',
        text: s.text,
        fontSize: s.fontSize,
        color: s.color,
      };
    if (!image) return null;
    return {
      kind: 'image',
      bytes: image.bytes,
      format: image.kind === 'jpeg' ? 'jpeg' : 'png',
      widthFraction: s.widthPercent / 100,
    };
  }, [s.mode, s.text, s.fontSize, s.color, s.widthPercent, image]);

  const options = useMemo<Omit<WatermarkOptions, 'content' | 'pages'>>(
    () => ({
      opacity: s.opacityPercent / 100,
      rotation: s.rotation,
      position: s.position,
      margin: MARGIN,
    }),
    [s.opacityPercent, s.rotation, s.position],
  );

  const previewKey = JSON.stringify({
    ...options,
    content: content?.kind === 'image' ? image?.id : content,
  });
  const buildPreview = useCallback(
    (page: Uint8Array) =>
      content
        ? watermark(page, { ...options, content, pages: [0] })
        : Promise.resolve(page),
    [content, options],
  );
  const preview = usePreviewBytes(
    file?.bytes ?? null,
    0,
    previewKey,
    buildPreview,
  );

  const job = useJob(
    async (
      _ctx,
      source: LoadedFile,
      pageCount: number,
      selection: PageSelection,
      opts: Omit<WatermarkOptions, 'pages'>,
    ): Promise<ResultFile[]> => {
      const pages = selectPages(selection, pageCount);
      const bytes = await watermark(source.bytes, { ...opts, pages });
      return [
        {
          name: deriveFilename(source.name, 'watermarked', 'pdf'),
          bytes,
          detail: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`,
        },
      ];
    },
  );

  /** Every setting or input change invalidates a finished result. */
  const change =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      job.reset();
      fn(v);
    };

  const pick = change((picked: LoadedFile) => setFile(picked));
  const clearFile = () => {
    job.reset();
    setFile(null);
  };
  const selection: PageSelection =
    pageMode === 'all' ? { mode: 'all' } : { mode: 'ranges', text: rangeText };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <Stack gap="4">
                <Stack gap="2">
                  <Label id="wm-type-label">Watermark type</Label>
                  <Tabs
                    value={s.mode}
                    onValueChange={change((v: string) =>
                      s.setMode(v as WatermarkMode),
                    )}
                    variant="soft"
                  >
                    <TabsList aria-labelledby="wm-type-label">
                      <TabsTrigger value="text">Text</TabsTrigger>
                      <TabsTrigger value="image">Image</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Stack>
                {s.mode === 'text' ? (
                  <>
                    <Stack gap="2">
                      <Label htmlFor="wm-text">Watermark text</Label>
                      <Input
                        id="wm-text"
                        value={s.text}
                        onChange={change(s.setText)}
                      />
                    </Stack>
                    <Inline gap="4" wrap>
                      <Stack gap="2">
                        <Label htmlFor="wm-size">Font size</Label>
                        <NumberInput
                          id="wm-size"
                          value={s.fontSize}
                          min={6}
                          max={400}
                          onValueChange={change((n: number) => {
                            if (Number.isFinite(n)) s.setFontSize(n);
                          })}
                        />
                      </Stack>
                      <Stack gap="2">
                        <Label htmlFor="wm-color">Colour</Label>
                        <Input
                          id="wm-color"
                          type="color"
                          value={s.color}
                          onChange={change(s.setColor)}
                          className="h-10 w-16 p-1"
                        />
                      </Stack>
                    </Inline>
                  </>
                ) : (
                  <>
                    {image ? (
                      <Inline justify="between" align="center" gap="3" wrap>
                        <Text weight="semibold">{image.name}</Text>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            job.reset();
                            setImage(null);
                          }}
                        >
                          Remove image
                        </Button>
                      </Inline>
                    ) : (
                      <PdfDropzone
                        accept={['png', 'jpeg']}
                        label="Drop a PNG or JPEG for the watermark"
                        onFiles={(files) => {
                          job.reset();
                          setImage(files[0]);
                        }}
                      />
                    )}
                    <Stack gap="2">
                      <Label htmlFor="wm-width">Image width (% of page)</Label>
                      <Inline gap="3" align="center">
                        <Slider
                          id="wm-width"
                          value={s.widthPercent}
                          min={5}
                          max={100}
                          onValueChange={change(s.setWidthPercent)}
                        />
                        <Text size="sm" className="w-12 font-mono">
                          {s.widthPercent}%
                        </Text>
                      </Inline>
                    </Stack>
                  </>
                )}
                <Stack gap="2">
                  <Label htmlFor="wm-opacity">Opacity</Label>
                  <Inline gap="3" align="center">
                    <Slider
                      id="wm-opacity"
                      value={s.opacityPercent}
                      min={5}
                      max={100}
                      step={5}
                      onValueChange={change(s.setOpacityPercent)}
                    />
                    <Text size="sm" className="w-12 font-mono">
                      {s.opacityPercent}%
                    </Text>
                  </Inline>
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="wm-rotation">Rotation</Label>
                  <Inline gap="3" align="center">
                    <Slider
                      id="wm-rotation"
                      value={s.rotation}
                      min={-90}
                      max={90}
                      step={5}
                      onValueChange={change(s.setRotation)}
                    />
                    <Text size="sm" className="w-12 font-mono">
                      {s.rotation}°
                    </Text>
                  </Inline>
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="wm-position">Position</Label>
                  <Select
                    id="wm-position"
                    value={s.position}
                    items={ANCHOR_OPTIONS}
                    onValueChange={change((v: string) =>
                      s.setPosition(v as Anchor),
                    )}
                  />
                </Stack>
                <Stack gap="2">
                  <Label id="wm-pages-label">Pages</Label>
                  <Tabs
                    value={pageMode}
                    onValueChange={change((v: string) =>
                      setPageMode(v as 'all' | 'ranges'),
                    )}
                    variant="soft"
                  >
                    <TabsList aria-labelledby="wm-pages-label">
                      <TabsTrigger value="all">All pages</TabsTrigger>
                      <TabsTrigger value="ranges">Some pages</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {pageMode === 'ranges' && (
                    <Input
                      aria-label="Page ranges"
                      value={rangeText}
                      onChange={change(setRangeText)}
                      placeholder="e.g. 1-3, 5"
                    />
                  )}
                </Stack>
                <Button
                  variant="solid"
                  leftIcon={<Droplets size={16} />}
                  disabled={job.status === 'running' || content === null}
                  onClick={() =>
                    content &&
                    job.run(file, doc.pageCount, selection, {
                      ...options,
                      content,
                    })
                  }
                >
                  Add watermark
                </Button>
              </Stack>
              <PdfPagePreview
                bytes={preview.bytes}
                width={260}
                label="Watermark preview"
                caption="Preview on page 1"
                pending={preview.pending}
                error={preview.error}
              />
            </div>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Watermarking">
            {job.result && <ResultFiles files={job.result} />}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfWatermarkTool;
