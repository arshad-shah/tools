import {
  Button,
  Grid,
  Notice,
  NumberField,
  Popover,
  Slider,
  Stack,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
import { settings as settingsIcon } from '@arshad-shah/cynosure/icons';
import React, { useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { entropyBits, poolSizeFor } from '../lib/entropy';
import {
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
  type PasswordOptions,
} from '../lib/generate';
import { optionsFrom } from '../lib/options';
import type { PasswordSettings } from '../settings';
import { ResultCard } from './ResultCard';

interface GeneratorTabProps {
  settings: PasswordSettings;
  update(patch: Partial<PasswordSettings>): void;
  pin: boolean;
  /** Bumped by Regenerate and Mod+Enter. */
  nonce: number;
  onRegenerate(): void;
  /** Places the result and the options (the tool's layout). */
  children(parts: {
    result: React.ReactNode;
    options: React.ReactNode;
  }): React.ReactNode;
}

/** Password and PIN modes: the options, and the result beside them. */
export const GeneratorTab: React.FC<GeneratorTabProps> = ({
  settings: s,
  update,
  pin,
  nonce,
  onRegenerate,
  children,
}) => {
  const opts = optionsFrom(s, pin);
  // Any option change or the nonce makes a fresh draw (auto-regenerate).
  const key = JSON.stringify(opts);
  const generated = useMemo(() => {
    void nonce;
    try {
      return { value: generatePassword(JSON.parse(key) as PasswordOptions) };
    } catch (e) {
      return { error: toToolError(e).message };
    }
  }, [key, nonce]);
  const bits = entropyBits(poolSizeFor(opts), opts.length);
  const changed =
    Number(s.minPerClass !== 1) +
    Number(s.includeChars !== '') +
    Number(s.excludeChars !== '');

  const result = generated.error ? (
    <Notice tone="danger">{generated.error}</Notice>
  ) : (
    <ResultCard
      value={generated.value!}
      bits={bits}
      label={pin ? 'PIN' : 'password'}
      onRegenerate={onRegenerate}
    />
  );

  const options = pin ? (
    <Stack gap="5">
      <NumberField
        label="PIN length"
        width="sm"
        value={s.pinLength}
        min={3}
        max={32}
        onChange={(v) => v !== null && update({ pinLength: v })}
      />
      <Stack gap="3">
        <Switch
          label="No repeated digits in a row"
          checked={s.pinNoRepeats}
          onChange={(v) => update({ pinNoRepeats: v })}
        />
        <Switch
          label="No runs like 123 or 321"
          checked={s.pinNoSequences}
          onChange={(v) => update({ pinNoSequences: v })}
        />
      </Stack>
    </Stack>
  ) : (
    <Stack gap="5">
      <Slider
        label="Length"
        showValue
        value={s.length}
        min={MIN_LENGTH}
        max={MAX_LENGTH}
        onChange={(v) => update({ length: v as number })}
      />
      <Grid minItemWidth="10rem" gap="3" role="group" aria-label="Characters">
        <Switch
          label="Lowercase"
          checked={s.lower}
          onChange={(v) => update({ lower: v })}
        />
        <Switch
          label="Uppercase"
          checked={s.upper}
          onChange={(v) => update({ upper: v })}
        />
        <Switch
          label="Digits"
          checked={s.digits}
          onChange={(v) => update({ digits: v })}
        />
        <Switch
          label="Symbols"
          checked={s.symbols}
          onChange={(v) => update({ symbols: v })}
        />
      </Grid>
      <Stack gap="3">
        <Switch
          label="Exclude look-alikes (Il1O0o)"
          checked={s.excludeAmbiguous}
          onChange={(v) => update({ excludeAmbiguous: v })}
        />
        <Switch
          label="Do not start with a symbol"
          checked={s.noLeadingSymbol}
          onChange={(v) => update({ noLeadingSymbol: v })}
        />
      </Stack>
      <Popover
        label="Custom characters"
        trigger={(props) => (
          <Button {...props} variant="soft" icon={settingsIcon}>
            {`Custom characters${changed ? ` (${changed})` : ''}`}
          </Button>
        )}
      >
        <Stack gap="4">
          <NumberField
            label="At least this many of each"
            value={s.minPerClass}
            min={0}
            max={10}
            onChange={(v) => v !== null && update({ minPerClass: v })}
          />
          <TextField
            label="Also use"
            value={s.includeChars}
            onChange={(v) => update({ includeChars: v })}
            placeholder="Extra characters"
            spellCheck={false}
          />
          <TextField
            label="Never use"
            value={s.excludeChars}
            onChange={(v) => update({ excludeChars: v })}
            placeholder="Characters to leave out"
            spellCheck={false}
          />
        </Stack>
      </Popover>
    </Stack>
  );

  return <>{children({ result, options })}</>;
};
