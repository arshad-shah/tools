import {
  Button,
  ColorField,
  FileDrop,
  Grid,
  Image,
  Inline,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { trash } from '@arshad-shah/cynosure/icons';
import { toDataUri } from '@/shared/lib/encoding';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import type { EccLevel } from '../lib/render';
import type { QrSettings } from '../settings';

const ECC_ITEMS = [
  { value: 'L', label: 'Low (7%)' },
  { value: 'M', label: 'Medium (15%)' },
  { value: 'Q', label: 'Quartile (25%)' },
  { value: 'H', label: 'High (30%)' },
];

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];

interface Props {
  settings: QrSettings;
  update(patch: Partial<QrSettings>): void;
  logo: string;
  onLogoChange(dataUrl: string): void;
}

/** Colours, size, error correction, quiet zone and a local logo. */
export function StylePanel({ settings: s, update, logo, onLogoChange }: Props) {
  const pickLogo = async (file: File) => {
    try {
      if (!LOGO_TYPES.includes(file.type))
        throw new Error('Choose a PNG, JPEG, WebP, GIF or SVG image');
      if (file.size > LOGO_MAX_BYTES)
        throw new Error('The logo must be 2 MB or smaller');
      onLogoChange(toDataUri(await readBytes(file), file.type));
      if (s.ecc === 'L' || s.ecc === 'M') update({ ecc: 'H' });
    } catch (e) {
      notify.error(toToolError(e, 'Could not read the logo'));
    }
  };
  const hex = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : null);
  return (
    <Stack gap="5">
      <Grid minItemWidth="12rem" gap="4">
        <ColorField
          label="Code colour"
          format="hex"
          value={s.fg}
          onChange={(v) => hex(v) && update({ fg: v })}
        />
        <ColorField
          label="Background colour"
          format="hex"
          value={s.bg}
          onChange={(v) => hex(v) && update({ bg: v })}
        />
        <Select
          label="Error correction"
          value={s.ecc}
          onChange={(v) => update({ ecc: v as EccLevel })}
          options={ECC_ITEMS}
        />
      </Grid>
      <Slider
        label="Preview size (px)"
        showValue
        value={s.size}
        min={128}
        max={512}
        step={16}
        onChange={(size) => update({ size: size as number })}
      />
      <Switch
        label="Quiet zone (4 modules)"
        checked={s.margin}
        onChange={(margin) => update({ margin })}
      />
      <Stack gap="3">
        <Text weight="medium">Logo (stays on this device)</Text>
        {logo ? (
          <Inline gap="3" align="center" wrap>
            <Image src={logo} alt="Logo" width={40} height={40} />
            <Button
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={trash}
              onClick={() => onLogoChange('')}
            >
              Remove logo
            </Button>
          </Inline>
        ) : (
          <FileDrop
            size="sm"
            accept={LOGO_TYPES.join(',')}
            hint="PNG, JPEG, WebP, GIF or SVG, up to 2 MB."
            labels={{ chooseOne: 'Add logo' }}
            onFiles={(f) => f[0] && void pickLogo(f[0])}
          />
        )}
        {logo ? (
          <Stack gap="4">
            <Slider
              label="Logo area (% of the code)"
              showValue
              value={Math.round(s.logoFraction * 100)}
              min={2}
              max={30}
              onChange={(v) => update({ logoFraction: (v as number) / 100 })}
            />
            <Switch
              label="Clear the modules behind the logo"
              checked={s.excavate}
              onChange={(excavate) => update({ excavate })}
            />
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
