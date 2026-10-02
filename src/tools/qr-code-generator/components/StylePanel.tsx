import { formatColor } from '@/shared/lib/colour';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { toDataUri } from '@/shared/lib/encoding';
import { readBytes } from '@/shared/lib/files';
import {
  Button,
  ColorPicker,
  FilePicker,
  Grid,
  Image,
  Inline,
  Label,
  Select,
  Slider,
  Stack,
  Text,
  SwitchField,
} from '@/shared/ui';
import { IconImage, IconTrash2 } from '@/shared/ui/icons';
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
  return (
    <Stack gap="4">
      <Grid max={2} gap="4">
        <ColorPicker
          label="Code colour"
          value={s.fg}
          onChange={(_, c) => update({ fg: formatColor(c, 'hex') })}
        />
        <ColorPicker
          label="Background colour"
          value={s.bg}
          onChange={(_, c) => update({ bg: formatColor(c, 'hex') })}
        />
      </Grid>
      <Grid max={2} gap="3">
        <Stack gap="1">
          <Label htmlFor="qr-ecc">Error correction</Label>
          <Select
            id="qr-ecc"
            value={s.ecc}
            onValueChange={(v) => update({ ecc: v as EccLevel })}
            items={ECC_ITEMS}
          />
        </Stack>
        <Stack gap="1">
          <Label htmlFor="qr-size">Preview size ({s.size} px)</Label>
          <Slider
            id="qr-size"
            value={s.size}
            min={128}
            max={512}
            step={16}
            onValueChange={(size) => update({ size })}
          />
        </Stack>
        <SwitchField
          label="Quiet zone (4 modules)"
          id="qr-margin"
          checked={s.margin}
          onCheckedChange={(margin) => update({ margin })}
        />
      </Grid>
      <Stack gap="2">
        <Text weight="medium">Logo (stays on this device)</Text>
        <Inline gap="2" align="center">
          {logo && (
            <Image src={logo} alt="Logo" fit="contain" className="h-10 w-10" />
          )}
          <FilePicker
            accept={LOGO_TYPES.join(',')}
            onFiles={(f) => f[0] && void pickLogo(f[0])}
          >
            {(open) => (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconImage size="sm" />}
                onClick={open}
              >
                {logo ? 'Change logo' : 'Add logo'}
              </Button>
            )}
          </FilePicker>
          {logo && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconTrash2 size="sm" />}
              onClick={() => onLogoChange('')}
            >
              Remove logo
            </Button>
          )}
        </Inline>
        {logo && (
          <Grid max={2} gap="3">
            <Stack gap="1">
              <Label htmlFor="qr-logo-size">
                Logo area ({Math.round(s.logoFraction * 100)}% of the code)
              </Label>
              <Slider
                id="qr-logo-size"
                value={Math.round(s.logoFraction * 100)}
                min={2}
                max={30}
                onValueChange={(v) => update({ logoFraction: v / 100 })}
              />
            </Stack>
            <SwitchField
              label="Clear the modules behind the logo"
              id="qr-excavate"
              checked={s.excavate}
              onCheckedChange={(excavate) => update({ excavate })}
            />
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}
