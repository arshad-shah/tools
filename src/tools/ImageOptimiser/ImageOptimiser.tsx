import React, { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
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
  Inline,
  Label,
  Select,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { useJob } from '@/shared/state/useJob';
import {
  aspectRatio,
  assertImageFile,
  convertImage,
  reductionLabel,
  type OutputFormat,
} from './convert';

interface ImageMetadata {
  filename: string;
  fileType: string;
  lastModified: string;
  aspectRatio: string;
}

const ImageOptimiser: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [compressionLevel, setCompressionLevel] = useState<number>(80);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);

  const job = useJob(
    async (ctx, file: File, format: OutputFormat, quality: number) => {
      const out = await convertImage(file, { format, quality }, ctx.signal);
      const url = URL.createObjectURL(out.blob);
      if (ctx.signal.aborted) {
        // Superseded: nobody will show (or revoke) this URL.
        URL.revokeObjectURL(url);
        throw new ToolError('CANCELLED', 'Cancelled');
      }
      return { ...out, url };
    },
  );
  const { reset: resetJob } = job;
  const result = job.result;
  const isProcessing = job.status === 'running';

  // Object URLs are revoked when replaced and on unmount.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      assertImageFile(file);
    } catch (e) {
      setErrorMessage(toToolError(e).message);
      return;
    }
    let width: number;
    let height: number;
    try {
      const bitmap = await createImageBitmap(file);
      ({ width, height } = bitmap);
      bitmap.close();
    } catch {
      setErrorMessage('Failed to load the image');
      return;
    }
    setErrorMessage('');
    resetJob();
    setSelectedFile(file);
    setDimensions({ width, height });
    setPreview(URL.createObjectURL(file));
    setMetadata({
      filename: file.name,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
      aspectRatio: aspectRatio(width, height),
    });
  };

  const processImage = () => {
    if (!selectedFile) return;
    void job.run(selectedFile, outputFormat, compressionLevel / 100);
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;
    saveBlob(
      result.blob,
      deriveFilename(selectedFile.name, 'optimized', outputFormat),
    );
  };

  const originalSize = selectedFile ? formatBytes(selectedFile.size) : null;
  const newSize = result ? formatBytes(result.blob.size) : null;

  const qualityHint =
    compressionLevel < 40
      ? 'Small file, lower quality'
      : compressionLevel < 70
        ? 'Balanced size and quality'
        : 'High quality, larger file';

  const reduction =
    selectedFile && result
      ? reductionLabel(selectedFile.size, result.blob.size)
      : 'N/A';
  const reductionStatus: 'success' | 'warning' =
    reduction === 'No reduction' ? 'warning' : 'success';
  const shownError = errorMessage || job.error?.message;

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
                <img src={preview} alt="Preview" width="100%" />
                <Inline justify="between" align="center" wrap>
                  <Text size="sm" tone="subtle">
                    Size: {originalSize}
                  </Text>
                  <Text size="sm" tone="subtle">
                    {dimensions.width} × {dimensions.height}px
                  </Text>
                </Inline>
                {metadata && (
                  <Card className="bg-surface-subtle">
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
                <Settings size={18} aria-hidden />
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
                <Button
                  variant="solid"
                  fullWidth
                  loading={isProcessing}
                  disabled={!selectedFile}
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
                  <img src={result.url} alt="Processed" width="100%" />
                  <Grid max={2} gap="3">
                    <Card className="bg-surface-subtle">
                      <CardBody>
                        <Text size="xs" tone="subtle">
                          Original
                        </Text>
                        <Text size="md" weight="semibold">
                          {originalSize}
                        </Text>
                      </CardBody>
                    </Card>
                    <Card className="bg-surface-subtle">
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
                  variant="solid"
                  size="lg"
                  fullWidth
                  leftIcon={<Save size={20} />}
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
