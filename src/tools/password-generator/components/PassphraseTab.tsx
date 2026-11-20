import {
  Inline,
  LoadingDots,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useMemo } from 'react';
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
  /** Places the result and the options (the tool's layout). */
  children(parts: {
    result: React.ReactNode;
    options: React.ReactNode;
  }): React.ReactNode;
}

export const PassphraseTab: React.FC<PassphraseTabProps> = ({
  settings: s,
  update,
  nonce,
  onRegenerate,
  children,
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

  const result = list ? (
    <ResultCard
      value={value}
      bits={passphraseEntropy(s.words, list.length, opts)}
      label="passphrase"
      onRegenerate={onRegenerate}
    />
  ) : (
    <Inline gap="2" align="center">
      <LoadingDots tone="muted" />
      <Text tone="muted">Loading the word list</Text>
    </Inline>
  );

  const options = (
    <Stack gap="5">
      <Slider
        label="Words"
        showValue
        value={s.words}
        min={MIN_WORDS}
        max={MAX_WORDS}
        onChange={(v) => update({ words: v as number })}
      />
      <TextField
        label="Separator"
        width="sm"
        value={s.separator}
        onChange={(v) => update({ separator: v.slice(0, 3) })}
      />
      <Stack gap="2">
        <Text weight="medium">Capitalise</Text>
        <SegmentedControl
          label="Capitalise"
          value={s.capitalise}
          onChange={(v) =>
            update({ capitalise: v as PasswordSettings['capitalise'] })
          }
          options={[
            { value: 'none', label: 'None' },
            { value: 'first', label: 'First letter' },
            { value: 'all', label: 'ALL' },
          ]}
        />
      </Stack>
      <Stack gap="3">
        <Switch
          label="Add a number"
          checked={s.addNumber}
          onChange={(v) => update({ addNumber: v })}
        />
        <Switch
          label="Add a symbol"
          checked={s.addSymbol}
          onChange={(v) => update({ addSymbol: v })}
        />
      </Stack>
      <Text size="sm" tone="muted">
        Words from the EFF large wordlist (7,776 words, CC BY 3.0 US).
      </Text>
    </Stack>
  );

  return <>{children({ result, options })}</>;
};
