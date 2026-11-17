import {
  Button,
  Card,
  EmptyState,
  Image,
  Inline,
  LoadingDots,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  copy as copyIcon,
  download,
  image as imageIcon,
  fileCode,
} from '@arshad-shah/cynosure/icons';
import type { ToolError } from '@/shared/lib/errors';
import type { CodeImagePreview } from '../hooks/useCodeImage';

interface PreviewPanelProps {
  preview: CodeImagePreview | null;
  error: ToolError | null;
  busy: boolean;
  /** No code yet. */
  empty: boolean;
  scale: number;
  canCopy: boolean;
  onPng(): void;
  onSvg(): void;
  onCopy(): void;
  onExample(): void;
}

/** The live image and its exports. */
export function PreviewPanel({
  preview,
  error,
  busy,
  empty,
  scale,
  canCopy,
  onPng,
  onSvg,
  onCopy,
  onExample,
}: PreviewPanelProps) {
  const ready = !!preview && !empty;
  return (
    <Card
      as="section"
      title="Preview"
      actions={
        busy && !empty ? <LoadingDots label="Drawing the image" /> : undefined
      }
    >
      <Stack gap="5">
        {empty ? (
          <EmptyState
            icon={imageIcon}
            title="No code yet"
            description="Paste code to see it as an image, then download it as PNG or SVG or copy it."
            actions={
              <Button variant="soft" onClick={onExample}>
                Try an example
              </Button>
            }
          />
        ) : null}
        {error && !empty ? (
          <Notice tone="danger" title="Could not draw the image">
            {error.message}
          </Notice>
        ) : null}
        {ready ? (
          <Stack gap="3" align="center">
            <Image
              src={preview.url}
              alt="Preview of the code image"
              width={preview.width}
              height={preview.height}
              loading="eager"
            />
            <Text size="sm" tone="muted" numeric>
              {`${Math.ceil(preview.width * scale)} by ${Math.ceil(preview.height * scale)} pixels`}
            </Text>
          </Stack>
        ) : null}
        <Inline gap="2" wrap>
          <Button
            variant="solid"
            tone="accent"
            icon={download}
            disabled={!ready}
            onClick={onPng}
          >
            Download PNG
          </Button>
          <Button
            variant="soft"
            icon={fileCode}
            disabled={!ready}
            onClick={onSvg}
          >
            Download SVG
          </Button>
          <Button
            variant="soft"
            icon={copyIcon}
            disabled={!ready}
            onClick={onCopy}
          >
            Copy image
          </Button>
        </Inline>
        {!canCopy ? (
          <Text size="sm" tone="muted">
            This browser cannot copy images; download the PNG instead.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
