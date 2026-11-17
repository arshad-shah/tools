import {
  Card,
  EmptyState,
  Grid,
  Image,
  Inline,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { image as imageIcon } from '@arshad-shah/cynosure/icons';
import { useEffect, useState } from 'react';
import { ToolError } from '@/shared/lib/errors';
import { MASKABLE_PADDING } from '../lib/outputs';
import { renderIcon, type IconSource } from '../lib/render';
import { SafeZoneRing } from '@/shared/surfaces/safe-zone';

interface Rendered {
  tab16: string;
  tab32: string;
  apple: string;
  maskable: string;
}

export interface PreviewPanelProps {
  source: IconSource | null;
  /** Fills the maskable icon behind image and SVG sources. */
  backgroundColor: string;
  name: string;
  shortName: string;
}

/** Renders the preview sizes whenever the source changes, as image URLs. */
function useRendered(source: IconSource | null, backgroundColor: string) {
  const [state, setState] = useState<{
    icons: Rendered | null;
    error: string | null;
  }>({ icons: null, error: null });
  useEffect(() => {
    if (!source) return;
    let live = true;
    let urls: string[] = [];
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
      (blobs) => {
        if (!live) return;
        urls = blobs.map((b) => URL.createObjectURL(b));
        const [tab16, tab32, apple, maskable] = urls;
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
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [source, backgroundColor]);
  return source ? state : { icons: null, error: null };
}

const MASKS = [
  { label: 'Circle', radius: 'full' },
  { label: 'Squircle', radius: 'card' },
  { label: 'Rounded square', radius: 'md' },
] as const;

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
    <Card as="section" title="Preview" headingLevel={2}>
      {error ? (
        <Notice tone="danger">{error}</Notice>
      ) : !icons ? (
        <EmptyState
          size="sm"
          icon={imageIcon}
          title="No icon yet"
          description="Choose a source to see the icons."
        />
      ) : (
        <Stack gap="6">
          <Stack gap="3">
            <Text size="sm" weight="medium">
              Browser tab
            </Text>
            <Inline gap="5" align="center" wrap>
              <Card variant="soft" padding="sm">
                <Inline gap="3" align="center">
                  <Grid columns="1rem">
                    <Image src={icons.tab16} alt="16 px favicon" ratio={1} />
                  </Grid>
                  <Text size="sm" truncate>
                    {title}
                  </Text>
                </Inline>
              </Card>
              <Inline gap="2" align="center">
                <Grid columns="2rem">
                  <Image src={icons.tab32} alt="32 px favicon" ratio={1} />
                </Grid>
                <Text size="xs" tone="muted">
                  32 px
                </Text>
              </Inline>
            </Inline>
          </Stack>
          <Stack gap="3">
            <Text size="sm" weight="medium">
              iOS home screen
            </Text>
            <Grid columns="6rem" gap="2">
              <Image
                src={icons.apple}
                alt="180 px Apple touch icon"
                ratio={1}
                radius="card"
              />
              <Text size="xs" align="center" truncate>
                {label}
              </Text>
            </Grid>
          </Stack>
          <Stack gap="3">
            <Text size="sm" weight="medium">
              Android adaptive icon (maskable 512)
            </Text>
            <Grid columns="repeat(3, 6rem)" gap="4">
              {MASKS.map((m) => (
                <Stack key={m.label} gap="2" align="center">
                  <Image
                    src={icons.maskable}
                    alt={`Android ${m.label.toLowerCase()} mask`}
                    ratio={1}
                    radius={m.radius}
                    overlay={<SafeZoneRing />}
                    overlayLabel="Safe zone, the middle 80% of the icon"
                  />
                  <Text size="xs" tone="muted">
                    {m.label}
                  </Text>
                </Stack>
              ))}
            </Grid>
            <Text size="xs" tone="muted">
              Launchers cut the icon to their own shape: keep the artwork inside
              the dashed ring (the middle 80%).
            </Text>
          </Stack>
        </Stack>
      )}
    </Card>
  );
}
