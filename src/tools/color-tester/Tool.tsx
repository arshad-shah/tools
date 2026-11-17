import {
  ColorField,
  ColorSample,
  Card,
  Grid,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useMemo, useState } from 'react';
import { ShareButton, ToolActions } from '@/app/ui/tool-actions';
import {
  contrastRatio,
  formatColor,
  parseColor,
  type Color,
} from '@/shared/lib/colour';
import { copyText } from '@/shared/lib/clipboard';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { ContrastPanel } from './components/ContrastPanel';
import { CvdToggle } from './components/CvdToggle';
import { ExtractPanel } from './components/ExtractPanel';
import { FormatList } from './components/FormatList';
import { PalettePanel } from './components/PalettePanel';
import { viewAs, type CvdMode } from './lib/harmonies';
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

const BLACK = parseColor('#000000');
const WHITE = parseColor('#ffffff');

/** Black or white, whichever reads better on `c`. */
const inkOn = (c: Color) =>
  contrastRatio(BLACK, c) >= contrastRatio(WHITE, c) ? '#000000' : '#ffffff';

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

  const baseHex = formatColor(base, 'hex');
  const shownBase = viewAs(base, cvd);

  return (
    <Stack gap="6">
      <ToolActions>
        <CvdToggle value={cvd} onChange={setCvd} />
        <ShareButton share={share} />
      </ToolActions>
      {showLoaded ? (
        <Notice
          tone="info"
          dismissible
          onDismiss={() => setShowLoaded(false)}
          labels={{ dismiss: 'Dismiss' }}
        >
          Loaded from a shared link
        </Notice>
      ) : null}

      <Grid columns={{ base: 1, lg: 2 }} gap="6" align="start">
        <Card as="section" title="Colour">
          <Stack gap="5">
            <ColorField
              label="Base colour"
              inline
              value={colors.base}
              onChange={(css) => setColors({ base: css })}
              alpha
            />
            <ColorSample
              color={shownBase}
              ink={inkOn(parseColor(shownBase))}
              contrast={false}
              size="lg"
              label="Base colour sample"
            >
              {baseHex}
            </ColorSample>
            <Text size="sm" tone="muted">
              {cvd === 'none'
                ? 'As picked'
                : `As seen with ${cvd} colour vision`}
            </Text>
            <FormatList color={base} />
          </Stack>
        </Card>
        <Card as="section" title="Contrast">
          <ContrastPanel
            fg={colors.fg}
            bg={colors.bg}
            onFg={(css) => setColors({ fg: css })}
            onBg={(css) => setColors({ bg: css })}
            onSwap={swap}
            cvd={cvd}
          />
        </Card>
      </Grid>

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

      <ExtractPanel
        onAdd={addToPalette}
        onUse={(css) => setColors({ base: css })}
        cvd={cvd}
      />
    </Stack>
  );
};

export default ColorTester;
