import { useMemo, useState } from 'react';
import {
  composite,
  contrastRatio,
  parseColor,
  type Color,
} from '@/shared/lib/colour';
import { IconArrowRightLeft, IconWand2 } from '@/shared/ui/icons';
import {
  Badge,
  Button,
  ColorBlock,
  ColorField,
  Inline,
  SegmentedControl,
  Stack,
  Text,
} from '@/shared/ui';
import {
  contrastSummary,
  suggestFor,
  type ContrastTarget,
} from '../lib/contrast-view';
import { viewAs, type CvdMode } from '../lib/harmonies';

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
    <Badge tone={pass ? 'success' : 'danger'} variant="soft" size="sm">
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
    <Stack gap="4">
      <Inline gap="3" align="end" wrap>
        <ColorField
          className="min-w-48 flex-1"
          label="Foreground"
          value={fg}
          onChange={(css) => onFg(css)}
          alpha
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<IconArrowRightLeft size="sm" />}
          onClick={onSwap}
        >
          Swap
        </Button>
        <ColorField
          className="min-w-48 flex-1"
          label="Background"
          value={bg}
          onChange={(css) => onBg(css)}
          alpha
        />
      </Inline>

      {view ? (
        <>
          <Inline gap="4" align="baseline" wrap>
            <Text size="lg" weight="semibold" mono>
              {`Ratio ${view.summary.ratio.toFixed(2)}:1`}
            </Text>
            <Text size="md" mono>{`APCA Lc ${view.summary.apca}`}</Text>
          </Inline>
          <Text size="sm" tone="muted">
            {view.summary.apcaHint}
          </Text>
          <Inline gap="2" wrap aria-label="WCAG 2.2 results" role="group">
            <Level name="AA normal" pass={view.summary.levels.normalAA} />
            <Level name="AAA normal" pass={view.summary.levels.normalAAA} />
            <Level name="AA large" pass={view.summary.levels.largeAA} />
            <Level name="AAA large" pass={view.summary.levels.largeAAA} />
            <Level name="UI" pass={view.summary.levels.uiAA} />
          </Inline>

          <Inline gap="2" align="center" wrap>
            <SegmentedControl<`${ContrastTarget}`>
              label="Target ratio"
              size="sm"
              value={target}
              onChange={setTarget}
              options={TARGETS}
            />
            <Button
              size="sm"
              leftIcon={<IconWand2 size="sm" />}
              disabled={!view.fgFix}
              onClick={() => view.fgFix && onFg(view.fgFix)}
            >
              Suggest passing foreground
            </Button>
            <Button
              size="sm"
              leftIcon={<IconWand2 size="sm" />}
              disabled={!view.bgFix}
              onClick={() => view.bgFix && onBg(view.bgFix)}
            >
              Suggest passing background
            </Button>
          </Inline>
          {view.passes ? (
            <Text size="xs" tone="muted">
              {`Already meets ${target}:1; nothing to suggest.`}
            </Text>
          ) : (
            (!view.fgFix || !view.bgFix) && (
              <Text size="xs" tone="muted">
                {`No lightness of the ${!view.fgFix ? 'foreground' : 'background'} hue reaches ${target}:1.`}
              </Text>
            )
          )}

          <ColorBlock
            color={view.bgHex}
            textColor={view.fgHex}
            className="grid gap-2 rounded-lg border border-line p-4"
            aria-label="Contrast preview"
            role="group"
            data-fg={view.fgHex}
            data-bg={view.bgHex}
          >
            <p className="text-sm">Small text, 14 px: the quick brown fox</p>
            <p className="text-base">
              Body text, 16 px: the quick brown fox jumps over the lazy dog
            </p>
            <p className="text-lg font-bold">Large bold text, 18.66 px</p>
            <p className="text-2xl">Large text, 24 px</p>
          </ColorBlock>
          {cvd !== 'none' && (
            <Text size="xs" tone="muted">
              {`Preview simulates ${cvd} colour vision; the numbers use the real colours.`}
            </Text>
          )}
        </>
      ) : (
        <Text size="sm" className="text-danger">
          Enter two valid colours
        </Text>
      )}
    </Stack>
  );
}
