import { useMemo, useState } from 'react';
import { formatColor, parseColor, type Color } from '@/shared/lib/colour';
import { copyText } from '@/shared/lib/clipboard';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import {
  Alert,
  AlertDescription,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ColorPicker,
  Grid,
  IconButton,
  Inline,
  ShareButton,
  Stack,
} from '@/shared/ui';
import { IconX } from '@/shared/ui/icons';
import { ContrastPanel } from './components/ContrastPanel';
import { CvdToggle } from './components/CvdToggle';
import { ExtractPanel } from './components/ExtractPanel';
import { FormatList } from './components/FormatList';
import { PalettePanel } from './components/PalettePanel';
import type { CvdMode } from './lib/harmonies';
import { COLOR_DEFAULTS, colorSettings, type ColorSettings } from './settings';
import {
  COLOR_SHARE_VERSION,
  MAX_SHARED_PALETTE,
  parseColorShare,
  type ColorShare,
} from './share';

const TOOL_ID = 'color-tester';

type Colors = ColorSettings['lastColors'];

const toHex = (css: string) => formatColor(parseColor(css), 'hex');

const parseOr = (css: string, fallback: string): Color => {
  try {
    return parseColor(css);
  } catch {
    return parseColor(fallback);
  }
};

const ColorTester = () => {
  const [settings, update] = colorSettings.useSettings();
  const [colors, setColorsState] = useState<Colors>(settings.lastColors);
  const [scale, setScaleState] = useState(settings.scale);
  const [palette, setPalette] = useState<string[]>([]);
  const [cvd, setCvd] = useState<CvdMode>('none');
  const [hydrated, setHydrated] = useState(false);
  const [showLoaded, setShowLoaded] = useState(false);

  const share = useShareableState<ColorShare>({
    toolId: TOOL_ID,
    version: COLOR_SHARE_VERSION,
    parse: parseColorShare,
    select: () => ({
      colors,
      palette: palette.slice(0, MAX_SHARED_PALETTE),
      scale,
    }),
  });

  // Hydrate once from a share link (render-phase, before the first paint).
  if (!hydrated) {
    setHydrated(true);
    if (share.loaded) {
      setColorsState(share.loaded.colors);
      setScaleState(share.loaded.scale);
      setPalette(share.loaded.palette.map(toHex));
      setShowLoaded(true);
    }
  }

  const setColors = (patch: Partial<Colors>) => {
    const next = { ...colors, ...patch };
    setColorsState(next);
    update({ lastColors: next });
  };
  const setScale = (next: ColorSettings['scale']) => {
    setScaleState(next);
    update({ scale: next });
  };

  const base = useMemo(
    () => parseOr(colors.base, COLOR_DEFAULTS.lastColors.base),
    [colors.base],
  );

  const swap = () => setColors({ fg: colors.bg, bg: colors.fg });
  const copyHex = async () => {
    const hex = formatColor(base, 'hex');
    try {
      await copyText(hex);
      notify.success(`Copied ${hex}`);
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not copy');
    }
  };
  const resetAll = () => {
    setColorsState(COLOR_DEFAULTS.lastColors);
    setScaleState(COLOR_DEFAULTS.scale);
    setPalette([]);
    setCvd('none');
    // Saved palettes are the user's presets and survive a reset.
    update({
      lastColors: COLOR_DEFAULTS.lastColors,
      scale: COLOR_DEFAULTS.scale,
    });
  };

  useToolCommands(TOOL_ID, [
    { id: 'copy-hex', label: 'Copy hex', run: () => void copyHex() },
    { id: 'swap', label: 'Swap colours', run: swap },
    { id: 'reset', label: 'Clear and reset colours', run: resetAll },
  ]);

  const addToPalette = (hexes: string[]) =>
    setPalette((p) =>
      [...p, ...hexes.filter((h) => !p.includes(h))].slice(
        0,
        MAX_SHARED_PALETTE,
      ),
    );

  return (
    <Box data-cvd={cvd} className="min-w-0">
      <Stack gap="4">
        <Inline gap="3" justify="between" align="center" wrap>
          <CvdToggle value={cvd} onChange={setCvd} />
          <ShareButton share={share} />
        </Inline>
        {showLoaded && (
          <Alert status="info">
            <Inline gap="2" justify="between" align="center" wrap={false}>
              <AlertDescription className="mt-0">
                Loaded from a shared link
              </AlertDescription>
              <IconButton
                label="Dismiss"
                icon={IconX}
                size="sm"
                variant="ghost"
                onClick={() => setShowLoaded(false)}
              />
            </Inline>
          </Alert>
        )}

        {/* Desktop: the picker beside formats and contrast; phones stack. */}
        <Grid
          cols={{ base: 1, lg: 2 }}
          gap="4"
          className="items-start [&>*]:min-w-0"
          data-testid="color-tester-columns"
        >
          <Card>
            <CardHeader>
              <CardTitle>Colour</CardTitle>
            </CardHeader>
            <CardBody>
              <ColorPicker
                label="Base colour"
                value={colors.base}
                onChange={(css) => setColors({ base: css })}
                alpha
                showEyeDropper
              />
            </CardBody>
          </Card>
          <Stack gap="4">
            <Card>
              <CardHeader>
                <CardTitle>Formats</CardTitle>
              </CardHeader>
              <CardBody>
                <FormatList color={base} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Contrast</CardTitle>
              </CardHeader>
              <CardBody>
                <ContrastPanel
                  fg={colors.fg}
                  bg={colors.bg}
                  onFg={(css) => setColors({ fg: css })}
                  onBg={(css) => setColors({ bg: css })}
                  onSwap={swap}
                  cvd={cvd}
                />
              </CardBody>
            </Card>
          </Stack>
        </Grid>

        <Card>
          <CardHeader>
            <CardTitle>Palette</CardTitle>
          </CardHeader>
          <CardBody>
            <PalettePanel
              base={base}
              palette={palette}
              onPaletteChange={setPalette}
              scale={scale}
              onScaleChange={setScale}
              onPickBase={(css) => setColors({ base: css })}
              cvd={cvd}
              saved={settings.palettes}
              onSavedChange={(palettes) => update({ palettes })}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Palette from an image</CardTitle>
          </CardHeader>
          <CardBody>
            <ExtractPanel onAdd={addToPalette} cvd={cvd} />
          </CardBody>
        </Card>
      </Stack>
    </Box>
  );
};

export default ColorTester;
