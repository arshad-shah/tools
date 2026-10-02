import React, { useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  Inline,
  Input,
  Label,
  NumberInput,
  Slider,
  Stack,
  SwitchField,
  Text,
} from '@/shared/ui';
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
}

/** Password and PIN modes: options on the left, the result below. */
export const GeneratorTab: React.FC<GeneratorTabProps> = ({
  settings: s,
  update,
  pin,
  nonce,
  onRegenerate,
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

  return (
    <Stack gap="4">
      {pin ? (
        <Stack gap="3">
          <Inline gap="2" align="center">
            <Label htmlFor="pin-length">PIN length</Label>
            <NumberInput
              id="pin-length"
              value={s.pinLength}
              onValueChange={(v) => update({ pinLength: v })}
              min={3}
              max={32}
            />
          </Inline>
          <Inline gap="4" wrap>
            <SwitchField
              id="pin-repeats"
              label="No repeated digits in a row"
              checked={s.pinNoRepeats}
              onCheckedChange={(v) => update({ pinNoRepeats: v })}
            />
            <SwitchField
              id="pin-sequences"
              label="No runs like 123 or 321"
              checked={s.pinNoSequences}
              onCheckedChange={(v) => update({ pinNoSequences: v })}
            />
          </Inline>
        </Stack>
      ) : (
        <Stack gap="3">
          <Stack gap="1">
            <Inline justify="between" align="center">
              <Label htmlFor="pw-length">Length</Label>
              <Text size="sm" weight="semibold">
                {s.length}
              </Text>
            </Inline>
            <Slider
              id="pw-length"
              aria-label="Length"
              value={s.length}
              onValueChange={(v) => update({ length: v })}
              min={MIN_LENGTH}
              max={MAX_LENGTH}
            />
          </Stack>
          <Inline gap="4" wrap>
            <SwitchField
              id="pw-lower"
              label="Lowercase"
              checked={s.lower}
              onCheckedChange={(v) => update({ lower: v })}
            />
            <SwitchField
              id="pw-upper"
              label="Uppercase"
              checked={s.upper}
              onCheckedChange={(v) => update({ upper: v })}
            />
            <SwitchField
              id="pw-digits"
              label="Digits"
              checked={s.digits}
              onCheckedChange={(v) => update({ digits: v })}
            />
            <SwitchField
              id="pw-symbols"
              label="Symbols"
              checked={s.symbols}
              onCheckedChange={(v) => update({ symbols: v })}
            />
          </Inline>
          <Inline gap="4" wrap>
            <SwitchField
              id="pw-ambiguous"
              label="Exclude look-alikes (Il1O0o)"
              checked={s.excludeAmbiguous}
              onCheckedChange={(v) => update({ excludeAmbiguous: v })}
            />
            <SwitchField
              id="pw-leading"
              label="Do not start with a symbol"
              checked={s.noLeadingSymbol}
              onCheckedChange={(v) => update({ noLeadingSymbol: v })}
            />
          </Inline>
          <Inline gap="4" wrap align="end">
            <Stack gap="1">
              <Label htmlFor="pw-min">At least this many of each</Label>
              <NumberInput
                id="pw-min"
                value={s.minPerClass}
                onValueChange={(v) => update({ minPerClass: v })}
                min={0}
                max={10}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="pw-include">Also use</Label>
              <Input
                id="pw-include"
                value={s.includeChars}
                onChange={(v) => update({ includeChars: v })}
                placeholder="Extra characters"
                spellCheck={false}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="pw-exclude">Never use</Label>
              <Input
                id="pw-exclude"
                value={s.excludeChars}
                onChange={(v) => update({ excludeChars: v })}
                placeholder="Characters to leave out"
                spellCheck={false}
              />
            </Stack>
          </Inline>
        </Stack>
      )}
      {generated.error ? (
        <Alert status="danger">
          <AlertDescription>{generated.error}</AlertDescription>
        </Alert>
      ) : (
        <ResultCard
          value={generated.value!}
          bits={bits}
          label={pin ? 'PIN' : 'password'}
          onRegenerate={onRegenerate}
        />
      )}
    </Stack>
  );
};
