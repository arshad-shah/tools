import React, { useRef, useState } from 'react';
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
} from '@/components/ui';

type OutputFormat = 'jpeg' | 'png' | 'webp';

interface ImageMetadata {
  filename: string;
  fileType: string;
  lastModified: string;
  aspectRatio: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const calculateAspectRatio = (w: number, h: number): string => {
  if (!w || !h) return 'Unknown';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
};

const calculateReduction = (
  originalSize: string | null,
  newSize: string | null,
): string => {
  if (!originalSize || !newSize) return 'N/A';
  const parse = (s: string): number => {
    const m = s.match(/^([\d.]+)\s*(\w+)$/);
    if (!m) return parseFloat(s);
    const v = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    if (u === 'mb' || u === 'mib') return v * 1048576;
    if (u === 'kb' || u === 'kib') return v * 1024;
    return v;
  };
  const o = parse(originalSize);
  const n = parse(newSize);
  if (o <= 0) return 'N/A';
  const r = ((o - n) / o) * 100;
  if (r <= 0) return 'No reduction';
  return `${r.toFixed(1)}%`;
};

const ImageOptimiser: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [compressionLevel, setCompressionLevel] = useState<number>(80);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      return;
    }
    setErrorMessage('');
    setSelectedFile(file);
    setOriginalSize(formatFileSize(file.size));
    setProcessedImage(null);
    setNewSize(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
        setPreview(event.target?.result as string);
        setMetadata({
          filename: file.name,
          fileType: file.type,
          lastModified: new Date(file.lastModified).toLocaleString(),
          aspectRatio: calculateAspectRatio(img.width, img.height),
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = () => {
    if (!selectedFile || !preview) return;
    setIsProcessing(true);
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setErrorMessage('Canvas reference is not available');
        setIsProcessing(false);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setErrorMessage('Unable to get canvas context');
        setIsProcessing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const quality = compressionLevel / 100;
        const dataUrl =
          outputFormat === 'png'
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL(`image/${outputFormat}`, quality);
        const base64 = dataUrl.split(',')[1];
        if (!base64) throw new Error('Failed to extract base64 data');
        const binarySize = Math.ceil(base64.length * 0.75);
        setProcessedImage(dataUrl);
        setNewSize(formatFileSize(binarySize));
      } catch (err) {
        setErrorMessage(
          `Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      setErrorMessage('Failed to load the image');
      setIsProcessing(false);
    };
    img.src = preview;
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `converted-image.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const qualityHint =
    compressionLevel < 40
      ? 'Small file, lower quality'
      : compressionLevel < 70
        ? 'Balanced size and quality'
        : 'High quality, larger file';

  const reduction = calculateReduction(originalSize, newSize);
  const reductionStatus: 'success' | 'warning' =
    reduction === 'No reduction' ? 'warning' : 'success';

  return (
    <Stack gap="6">
      <Card>
        <CardBody>
          <Stack gap="3" align="center">
            <FileUpload
              onFiles={handleFiles}
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

      {errorMessage && (
        <Alert status="danger">
          <AlertDescription>{errorMessage}</AlertDescription>
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
                    onValueChange={(v) => setOutputFormat(v as OutputFormat)}
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
                    onValueChange={(v) => setCompressionLevel(v)}
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

      {processedImage && (
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
                  <img src={processedImage} alt="Processed" width="100%" />
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

      <Box className="hidden">
        <canvas ref={canvasRef} />
      </Box>
    </Stack>
  );
};

export default ImageOptimiser;
