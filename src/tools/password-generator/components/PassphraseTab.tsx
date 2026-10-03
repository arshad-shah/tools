import React, { useMemo } from 'react';
import {
  Divider,
  Inline,
  Input,
  Label,
  LoadingState,
  SegmentedControl,
  Slider,
  Stack,
  SwitchField,
  Text,
} from '@/shared/ui';
import { useWordlist } from '../hooks/useWordlist';
import {
  generatePassphrase,
  type PassphraseOptions,
  MAX_WORDS,
  MIN_WORDS,
  passphraseEntropy,
} from '../lib/passphrase';
import type { PasswordSettings } from '../settings';
import { ResultCard } from './ResultCard';

interface PassphraseTabProps {
  settings: PasswordSettings;
  update(patch: Partial<PasswordSettings>): void;
  nonce: number;
  onRegenerate(): void;
}

export const PassphraseTab: React.FC<PassphraseTabProps> = ({
  settings: s,
  update,
  nonce,
  onRegenerate,
}) => {
  const list = useWordlist();
  const opts = {
    words: s.words,
    separator: s.separator,
    capitalise: s.capitalise,
    addNumber: s.addNumber,
    addSymbol: s.addSymbol,
  };
  const key = JSON.stringify(opts);
  const value = useMemo(() => {
    void nonce;
    return list
      ? generatePassphrase(JSON.parse(key) as PassphraseOptions, list)
      : '';
  }, [list, key, nonce]);

  return (
    <Stack gap="5">
      {list ? (
        <ResultCard
          value={value}
          bits={passphraseEntropy(s.words, list.length, opts)}
          label="passphrase"
          onRegenerate={onRegenerate}
        />
      ) : (
        <LoadingState label="Loading the word list" />
      )}
      <Divider />
      <Stack gap="1">
        <Inline justify="between" align="center">
          <Label htmlFor="pp-words">Words</Label>
          <Text size="sm" weight="semibold">
            {s.words}
          </Text>
        </Inline>
        <Slider
          id="pp-words"
          aria-label="Words"
          value={s.words}
          onValueChange={(v) => update({ words: v })}
          min={MIN_WORDS}
          max={MAX_WORDS}
        />
      </Stack>
      <Inline gap="4" wrap align="end">
        <Stack gap="1">
          <Label htmlFor="pp-separator">Separator</Label>
          <div className="w-24">
            <Input
              id="pp-separator"
              value={s.separator}
              onChange={(v) => update({ separator: v.slice(0, 3) })}
            />
          </div>
        </Stack>
        <SegmentedControl<PasswordSettings['capitalise']>
          label="Capitalise"
          value={s.capitalise}
          onChange={(v) => update({ capitalise: v })}
          size="sm"
          options={[
            { value: 'none', label: 'none' },
            { value: 'first', label: 'First letter' },
            { value: 'all', label: 'ALL' },
          ]}
        />
        <SwitchField
          id="pp-number"
          label="Add a number"
          checked={s.addNumber}
          onCheckedChange={(v) => update({ addNumber: v })}
        />
        <SwitchField
          id="pp-symbol"
          label="Add a symbol"
          checked={s.addSymbol}
          onCheckedChange={(v) => update({ addSymbol: v })}
        />
      </Inline>
      <Text size="xs" tone="subtle">
        Words from the EFF large wordlist (7,776 words, CC BY 3.0 US).
      </Text>
    </Stack>
  );
};
