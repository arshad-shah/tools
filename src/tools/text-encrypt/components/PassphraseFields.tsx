import {
  Button,
  Grid,
  Inline,
  ProgressBar,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { sparkles } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { estimateBits } from '../lib/strength';

interface PassphraseFieldsProps {
  value: string;
  onChange(v: string): void;
  /** Encrypting asks for the passphrase twice. */
  confirm?: { value: string; onChange(v: string): void };
  onGenerate?(): void;
}

/** Passphrase entry; never stored. */
export const PassphraseFields: React.FC<PassphraseFieldsProps> = ({
  value,
  onChange,
  confirm,
  onGenerate,
}) => {
  const bits = estimateBits(value);
  const mismatch = confirm && confirm.value !== '' && confirm.value !== value;
  return (
    <Stack gap="4">
      <Grid minItemWidth="14rem" gap="4">
        <TextField
          label="Passphrase"
          type="password"
          revealable
          autoComplete="new-password"
          spellCheck={false}
          value={value}
          onChange={onChange}
        />
        {confirm ? (
          <TextField
            label="Confirm passphrase"
            type="password"
            revealable
            autoComplete="new-password"
            spellCheck={false}
            value={confirm.value}
            onChange={confirm.onChange}
            error={mismatch ? 'The passphrases do not match' : undefined}
          />
        ) : null}
      </Grid>
      {confirm && value ? (
        <ProgressBar
          label="Passphrase strength"
          meter
          showValue
          value={Math.min(100, bits)}
          valueText={`About ${Math.round(bits)} bits`}
          tone={bits < 50 ? 'danger' : bits < 80 ? 'warning' : 'success'}
          size="sm"
        />
      ) : null}
      {onGenerate ? (
        <Inline>
          <Button size="sm" variant="soft" icon={sparkles} onClick={onGenerate}>
            Generate passphrase
          </Button>
        </Inline>
      ) : null}
    </Stack>
  );
};
