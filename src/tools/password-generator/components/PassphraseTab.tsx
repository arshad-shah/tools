import React, { useMemo } from 'react';
import {
  Inline,
  Input,
  Label,
  LoadingState,
  SegmentedControl,
  Slider,
  Stack,
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
import { OptionSwitch } from './OptionSwitch';
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
    <Stack gap="4">
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
        <OptionSwitch
          id="pp-number"
          label="Add a number"
          checked={s.addNumber}
          onChange={(v) => update({ addNumber: v })}
        />
        <OptionSwitch
          id="pp-symbol"
          label="Add a symbol"
          checked={s.addSymbol}
          onChange={(v) => update({ addSymbol: v })}
        />
      </Inline>
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
      <Text size="xs" tone="subtle">
        Words from the EFF large wordlist (7,776 words, CC BY 3.0 US).
      </Text>
    </Stack>
  );
};
