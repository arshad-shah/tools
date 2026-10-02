import { useEffect, useState } from 'react';
import { ToolError } from '@/shared/lib/errors';
import {
  Alert,
  AlertDescription,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Image,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { IconShapes } from '@/shared/ui/icons';
import { MASKABLE_PADDING } from '../lib/outputs';
import { renderIcon, type IconSource } from '../lib/render';

interface Rendered {
  tab16: Blob;
  tab32: Blob;
  apple: Blob;
  maskable: Blob;
}

export interface PreviewPanelProps {
  source: IconSource | null;
  /** Fills the maskable icon behind image and SVG sources. */
  backgroundColor: string;
  name: string;
  shortName: string;
}

/** Renders the preview sizes whenever the source changes. */
function useRendered(source: IconSource | null, backgroundColor: string) {
  const [state, setState] = useState<{
    icons: Rendered | null;
    error: string | null;
  }>({ icons: null, error: null });
  useEffect(() => {
    if (!source) return;
    let live = true;
    const background = source.kind === 'text' ? source.bg : backgroundColor;
    void Promise.all([
      renderIcon(source, 16),
      renderIcon(source, 32),
      renderIcon(source, 180),
      renderIcon(source, 512, {
        maskablePadding: MASKABLE_PADDING,
        background,
      }),
    ]).then(
      ([tab16, tab32, apple, maskable]) => {
        if (live)
          setState({ icons: { tab16, tab32, apple, maskable }, error: null });
      },
      (e: unknown) => {
        if (live)
          setState({
            icons: null,
            error:
              e instanceof ToolError
                ? e.message
                : 'The icon could not be drawn',
          });
      },
    );
    return () => {
      live = false;
    };
  }, [source, backgroundColor]);
  return source ? state : { icons: null, error: null };
}

const MASKS = [
  { label: 'Circle', shape: 'rounded-full' },
  { label: 'Squircle', shape: 'rounded-[30%]' },
  { label: 'Rounded square', shape: 'rounded-xl' },
] as const;

function MaskPreview({
  blob,
  label,
  shape,
}: {
  blob: Blob;
  label: string;
  shape: string;
}) {
  return (
    <Stack gap="1" align="center">
      <Box className={`relative size-32 overflow-hidden ${shape}`}>
        <Image
          src={blob}
          alt={`Android ${label.toLowerCase()} mask`}
          className="size-full"
        />
        {/* The 80% safe zone: content outside it may be cut off. */}
        <Box className="absolute inset-[10%] rounded-full border border-dashed border-fg-subtle" />
      </Box>
      <Text size="xs" tone="muted">
        {label}
      </Text>
    </Stack>
  );
}

/** Browser tab, iOS home screen and Android adaptive icon previews. */
export function PreviewPanel({
  source,
  backgroundColor,
  name,
  shortName,
}: PreviewPanelProps) {
  const { icons, error } = useRendered(source, backgroundColor);
  const title = name.trim() || 'My app';
  const label = shortName.trim() || title;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Preview</CardTitle>
      </CardHeader>
      <CardBody>
        {error ? (
          <Alert status="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !icons ? (
          <EmptyState
            size="sm"
            icon={IconShapes}
            title="No icon yet"
            description="Choose a source to see the icons."
          />
        ) : (
          <Stack gap="5">
            <Stack gap="2">
              <Text size="sm" weight="medium">
                Browser tab
              </Text>
              <Inline gap="4" align="center" wrap>
                <Box className="flex max-w-60 items-center gap-2 rounded-t-lg border border-b-0 border-line bg-surface-2 px-3 py-2">
                  <Image
                    src={icons.tab16}
                    alt="16 px favicon"
                    className="size-4 shrink-0"
                  />
                  <Text as="span" size="sm" className="truncate">
                    {title}
                  </Text>
                </Box>
                <Inline gap="2" align="center">
                  <Image
                    src={icons.tab32}
                    alt="32 px favicon"
                    className="size-8"
                  />
                  <Text as="span" size="xs" tone="muted">
                    32 px
                  </Text>
                </Inline>
              </Inline>
            </Stack>

            <Stack gap="2">
              <Text size="sm" weight="medium">
                iOS home screen
              </Text>
              <Box className="flex w-fit flex-col items-center gap-2 rounded-xl bg-surface-3 p-4">
                <Image
                  src={icons.apple}
                  alt="180 px Apple touch icon"
                  className="size-45 rounded-[22%]"
                />
                <Text as="span" size="xs">
                  {label}
                </Text>
              </Box>
            </Stack>

            <Stack gap="2">
              <Text size="sm" weight="medium">
                Android adaptive icon (maskable 512, shown at 128 px)
              </Text>
              <Inline gap="4" wrap>
                {MASKS.map((m) => (
                  <MaskPreview
                    key={m.label}
                    blob={icons.maskable}
                    label={m.label}
                    shape={m.shape}
                  />
                ))}
              </Inline>
              <Text size="xs" tone="muted">
                The dashed circle is the safe zone: keep the artwork inside it.
              </Text>
            </Stack>
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}
