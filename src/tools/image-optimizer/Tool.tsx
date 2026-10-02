import React, { useState } from 'react';
import { IconSave, IconSettings } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FileUpload,
  Grid,
  Heading,
  Image,
  Inline,
  Input,
  Label,
  Select,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useObjectUrl } from '@/shared/lib/object-url';
import { useJob } from '@/shared/state/useJob';
import {
  aspectRatio,
  assertImageFile,
  convertImage,
  decodeImage,
  DEFAULT_BACKGROUND,
  isHexColor,
  needsBackground,
  qualityApplies,
  reductionLabel,
  type OutputFormat,
} from './lib/convert';
import { useHandoffFiles } from '@/shared/lib/handoff';

interface LoadedImage {
  file: File;
  bytes: Uint8Array;
  width: number;
  height: number;
}

const ImageOptimiser: React.FC = () => {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [compressionLevel, setCompressionLevel] = useState<number>(80);

  // A newer pick supersedes an older one still decoding, so the last file
  // picked always wins.
  const loadJob = useJob(async (_ctx, file: File): Promise<LoadedImage> => {
    assertImageFile(file);
    const bytes = await readBytes(file);
    try {
      const { width, height } = await decodeImage(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: file.type }),
      );
      return { file, bytes, width, height };
    } catch (cause) {
      throw new ToolError('INVALID_FILE', 'Failed to load the image', {
        cause,
      });
    }
  });

  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const backgroundValid = isHexColor(background);

  const job = useJob(
    (ctx, file: File, format: OutputFormat, quality: number, fill: string) =>
      convertImage(file, { format, quality, background: fill }, ctx.signal),
  );
  const { reset: resetJob } = job;
  const result = job.result;
  const isProcessing = job.status === 'running';

  const selectedFile = loaded?.file ?? null;
  const preview = useObjectUrl(
    loaded?.bytes ?? null,
    loaded?.file.type ?? 'application/octet-stream',
  );
  const processedUrl = useObjectUrl(
    result?.bytes ?? null,
    result?.mime ?? 'application/octet-stream',
  );
  const dimensions = {
    width: loaded?.width ?? 0,
    height: loaded?.height ?? 0,
  };
  const metadata = loaded && {
    filename: loaded.file.name,
    fileType: loaded.file.type,
    lastModified: new Date(loaded.file.lastModified).toLocaleString(),
    aspectRatio: aspectRatio(loaded.width, loaded.height),
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const next = await loadJob.run(file);
    if (!next) return; // the error is shown inline
    resetJob();
    setLoaded(next);
  };
  // Images dropped on a hub open like picked ones (spec §5.3).
  useHandoffFiles((files) => void handleFiles(files));

  const processImage = () => {
    if (!selectedFile) return;
    void job.run(
      selectedFile,
      outputFormat,
      compressionLevel / 100,
      background,
    );
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;
    saveBlob(
      result.bytes,
      deriveFilename(selectedFile.name, 'optimized', outputFormat),
      result.mime,
    );
  };

  const originalSize = selectedFile ? formatBytes(selectedFile.size) : null;
  const newSize = result ? formatBytes(result.bytes.length) : null;

  const qualityHint =
    compressionLevel < 40
      ? 'Small file, lower quality'
      : compressionLevel < 70
        ? 'Balanced size and quality'
        : 'High quality, larger file';

  const reduction =
    selectedFile && result
      ? reductionLabel(selectedFile.size, result.bytes.length)
      : 'N/A';
  const reductionStatus: 'success' | 'warning' =
    reduction === 'No reduction' ? 'warning' : 'success';
  const shownError = loadJob.error?.message ?? job.error?.message;

  return (
    <Stack gap="6">
      <Card>
        <CardBody>
          <Stack gap="3" align="center">
            <FileUpload
              onFiles={(f) => void handleFiles(f)}
              accept="image/*"
              className="w-full"
              label="Select an image"
            />
            {selectedFile ? (
              <Text size="sm" tone="subtle">
                Selected:{' '}
                <Text as="span" weight="medium">
                  {selectedFile.name}
                </Text>
              </Text>
            ) : (
              <Text size="sm" tone="subtle">
                Supported: JPG, PNG, GIF, WebP, BMP
              </Text>
            )}
          </Stack>
        </CardBody>
      </Card>

      {shownError && (
        <Alert status="danger">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <Grid max={2} gap="4">
          <Card>
            <CardHeader>
              <Inline align="center" gap="2">
                <span
                  className="inline-block size-2 rounded-full bg-accent"
                  aria-hidden
                />
                <CardTitle as="h3">Original image</CardTitle>
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="3">
                <Image src={preview} alt="Preview" className="w-full" />
                <Inline justify="between" align="center" wrap>
                  <Text size="sm" tone="subtle">
                    Size: {originalSize}
                  </Text>
                  <Text size="sm" tone="subtle">
                    {dimensions.width} × {dimensions.height}px
                  </Text>
                </Inline>
                {metadata && (
                  <Card className="bg-surface-2">
                    <CardBody>
                      <Stack gap="1">
                        <Text size="xs" weight="semibold">
                          Metadata
                        </Text>
                        <Text size="xs">Filename: {metadata.filename}</Text>
                        <Text size="xs">Type: {metadata.fileType}</Text>
                        <Text size="xs">Modified: {metadata.lastModified}</Text>
                        <Text size="xs">Aspect: {metadata.aspectRatio}</Text>
                      </Stack>
                    </CardBody>
                  </Card>
                )}
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Inline align="center" gap="2">
                <IconSettings size="md" />
                <CardTitle as="h3">Conversion settings</CardTitle>
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="5">
                <Stack gap="2">
                  <Label>Output format</Label>
                  <Select
                    value={outputFormat}
                    onValueChange={(v) => {
                      setOutputFormat(v as OutputFormat);
                      resetJob();
                    }}
                    items={[
                      { value: 'jpeg', label: 'JPEG' },
                      { value: 'png', label: 'PNG' },
                      { value: 'webp', label: 'WEBP' },
                    ]}
                    aria-label="Output format"
                  />
                </Stack>
                {qualityApplies(outputFormat) ? (
                  <Stack gap="2">
                    <Label>Compression quality: {compressionLevel}%</Label>
                    <Slider
                      value={compressionLevel}
                      onValueChange={(v) => {
                        setCompressionLevel(v);
                        resetJob();
                      }}
                      min={1}
                      max={100}
                      step={1}
                      aria-label="Compression quality"
                    />
                    <Text size="xs" tone="subtle">
                      {qualityHint}
                    </Text>
                  </Stack>
                ) : (
                  <Text size="sm" tone="subtle">
                    PNG is lossless, so there is no quality setting and the file
                    can end up larger than the original. Choose JPEG or WebP for
                    a smaller file.
                  </Text>
                )}
                {needsBackground(outputFormat) && (
                  <Stack gap="2">
                    <Label htmlFor="image-background">Background colour</Label>
                    <Input
                      id="image-background"
                      value={background}
                      onChange={(v) => {
                        setBackground(v.trim());
                        resetJob();
                      }}
                      invalid={!backgroundValid}
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <Text size="xs" tone="subtle">
                      {backgroundValid
                        ? 'JPEG has no transparency: transparent areas are filled with this colour.'
                        : 'Enter a colour as #rrggbb, for example #ffffff.'}
                    </Text>
                  </Stack>
                )}
                <Button
                  variant="primary"
                  fullWidth
                  loading={isProcessing}
                  disabled={
                    !selectedFile ||
                    (needsBackground(outputFormat) && !backgroundValid)
                  }
                  onClick={processImage}
                >
                  {isProcessing ? 'Processing…' : 'Convert & compress'}
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      )}

      {result && (
        <Card>
          <CardHeader>
            <Alert status={reductionStatus}>
              <AlertTitle>Processing complete</AlertTitle>
              {reduction !== 'No reduction' && (
                <AlertDescription>
                  Size reduction:{' '}
                  <Text as="span" weight="semibold">
                    {reduction}
                  </Text>
                </AlertDescription>
              )}
            </Alert>
          </CardHeader>
          <CardBody>
            <Grid max={3} gap="4">
              <Box className="lg:col-span-2">
                <Stack gap="3">
                  <Heading level={4} size="md">
                    Processed image
                  </Heading>
                  {processedUrl && (
                    <Image
                      src={processedUrl}
                      alt="Processed"
                      className="w-full"
                    />
                  )}
                  <Grid max={2} gap="3">
                    <Card className="bg-surface-2">
                      <CardBody>
                        <Text size="xs" tone="subtle">
                          Original
                        </Text>
                        <Text size="md" weight="semibold">
                          {originalSize}
                        </Text>
                      </CardBody>
                    </Card>
                    <Card className="bg-surface-2">
                      <CardBody>
                        <Text size="xs" tone="subtle">
                          Compressed
                        </Text>
                        <Text size="md" weight="semibold">
                          {newSize}
                        </Text>
                      </CardBody>
                    </Card>
                  </Grid>
                </Stack>
              </Box>
              <Stack gap="3" justify="center" align="center">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<IconSave size="lg" />}
                  onClick={downloadImage}
                >
                  Download image
                </Button>
                <Badge variant="soft" tone="neutral" size="sm">
                  Format: {outputFormat.toUpperCase()}
                </Badge>
              </Stack>
            </Grid>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
};

export default ImageOptimiser;
