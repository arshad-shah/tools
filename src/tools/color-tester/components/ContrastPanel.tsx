import { useMemo, useState } from 'react';
import {
  composite,
  contrastRatio,
  parseColor,
  type Color,
} from '@/shared/lib/colour';
import {
  Badge,
  Button,
  ColorField,
  Grid,
  Heading,
  IconButton,
  Inline,
  Notice,
  SegmentedControl,
  Stack,
  Stat,
  Text,
} from '@arshad-shah/cynosure';
import { swap, wand } from '@arshad-shah/cynosure/icons';
import {
  contrastSummary,
  suggestFor,
  type ContrastTarget,
} from '../lib/contrast-view';
import { viewAs, type CvdMode } from '../lib/harmonies';
import { ColourSurface } from './ColourSurface';

export interface ContrastPanelProps {
  fg: string;
  bg: string;
  onFg(css: string): void;
  onBg(css: string): void;
  onSwap(): void;
  cvd: CvdMode;
}

const TARGETS: { value: `${ContrastTarget}`; label: string }[] = [
  { value: '3', label: '3:1' },
  { value: '4.5', label: '4.5:1' },
  { value: '7', label: '7:1' },
];

const WHITE: Color = { r: 1, g: 1, b: 1, alpha: 1 };

function Level({ name, pass }: { name: string; pass: boolean }) {
  return (
    <Badge tone={pass ? 'success' : 'danger'} variant="soft">
      {`${name}: ${pass ? 'pass' : 'fail'}`}
    </Badge>
  );
}

const safeParse = (css: string): Color | null => {
  try {
    return parseColor(css);
  } catch {
    return null;
  }
};

/** Foreground over background: WCAG 2.2 levels, APCA and a fix. */
export function ContrastPanel({
  fg,
  bg,
  onFg,
  onBg,
  onSwap,
  cvd,
}: ContrastPanelProps) {
  const [target, setTarget] = useState<`${ContrastTarget}`>('4.5');
  const t = Number(target) as ContrastTarget;

  const view = useMemo(() => {
    const f = safeParse(fg);
    const b = safeParse(bg);
    if (!f || !b) return null;
    const summary = contrastSummary(f, b);
    const passes = contrastRatio(f, b) >= t;
    const back = composite(b, WHITE);
    const text = composite(f, back);
    return {
      summary,
      passes,
      bgHex: viewAs(back, cvd),
      fgHex: viewAs(text, cvd),
      fgFix: passes ? null : suggestFor(f, b, t, 'fg'),
      bgFix: passes ? null : suggestFor(f, b, t, 'bg'),
    };
  }, [fg, bg, cvd, t]);

  return (
    <Stack gap="5">
      <Grid columns="minmax(0, 1fr) auto minmax(0, 1fr)" gap="3" align="end">
        <ColorField
          label="Foreground"
          value={fg}
          onChange={(css) => onFg(css)}
          alpha
        />
        <IconButton
          variant="ghost"
          tone="neutral"
          icon={swap}
          label="Swap"
          onClick={onSwap}
        />
        <ColorField
          label="Background"
          value={bg}
          onChange={(css) => onBg(css)}
          alpha
        />
      </Grid>

      {view ? (
        <>
          <ColourSurface
            bg={view.bgHex}
            fg={view.fgHex}
            label="Contrast preview"
          >
            <Stack gap="2">
              <Text size="sm">Small text, 14 px: the quick brown fox</Text>
              <Text size="md">
                Body text, 16 px: the quick brown fox jumps over the lazy dog
              </Text>
              <Text size="lg" weight="bold">
                Large bold text, 18.66 px
              </Text>
              <Heading level={4} size="lg">
                Large text, 24 px
              </Heading>
            </Stack>
          </ColourSurface>
          {cvd !== 'none' ? (
            <Text size="xs" tone="muted">
              {`Preview simulates ${cvd} colour vision; the numbers use the real colours.`}
            </Text>
          ) : null}
          <Grid columns={2} gap="3">
            <Stat
              label="WCAG ratio"
              value={`${view.summary.ratio.toFixed(2)}:1`}
              variant="soft"
              size="sm"
            />
            <Stat
              label="APCA"
              value={`Lc ${view.summary.apca}`}
              description={view.summary.apcaHint}
              variant="soft"
              size="sm"
            />
          </Grid>
          <Inline gap="2" aria-label="WCAG 2.2 results" role="group" wrap>
            <Level name="AA normal" pass={view.summary.levels.normalAA} />
            <Level name="AAA normal" pass={view.summary.levels.normalAAA} />
            <Level name="AA large" pass={view.summary.levels.largeAA} />
            <Level name="AAA large" pass={view.summary.levels.largeAAA} />
            <Level name="UI" pass={view.summary.levels.uiAA} />
          </Inline>

          <Stack gap="3">
            <SegmentedControl
              label="Target ratio"
              size="sm"
              value={target}
              onChange={(v) => setTarget(v as `${ContrastTarget}`)}
              options={TARGETS}
            />
            <Inline gap="2" wrap>
              <Button
                size="sm"
                variant="soft"
                icon={wand}
                disabled={!view.fgFix}
                onClick={() => view.fgFix && onFg(view.fgFix)}
              >
                Suggest passing foreground
              </Button>
              <Button
                size="sm"
                variant="soft"
                icon={wand}
                disabled={!view.bgFix}
                onClick={() => view.bgFix && onBg(view.bgFix)}
              >
                Suggest passing background
              </Button>
            </Inline>
            {view.passes ? (
              <Text size="sm" tone="muted">
                {`Already meets ${target}:1; nothing to suggest.`}
              </Text>
            ) : !view.fgFix || !view.bgFix ? (
              <Text size="sm" tone="muted">
                {`No lightness of the ${!view.fgFix ? 'foreground' : 'background'} hue reaches ${target}:1.`}
              </Text>
            ) : null}
          </Stack>
        </>
      ) : (
        <Notice tone="danger">Enter two valid colours</Notice>
      )}
    </Stack>
  );
}
