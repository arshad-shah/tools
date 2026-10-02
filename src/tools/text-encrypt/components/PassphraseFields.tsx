import React from 'react';
import { IconSparkles } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  Input,
  Label,
  Meter,
  Stack,
} from '@/shared/ui';
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
    <Stack gap="2">
      <Inline gap="3" align="end" wrap>
        <Stack gap="1" className="min-w-56 flex-1">
          <Label htmlFor="enc-pass">Passphrase</Label>
          <Input
            id="enc-pass"
            type="password"
            value={value}
            onChange={onChange}
            autoComplete="new-password"
            spellCheck={false}
          />
        </Stack>
        {confirm && (
          <Stack gap="1" className="min-w-56 flex-1">
            <Label htmlFor="enc-pass-confirm">Confirm passphrase</Label>
            <Input
              id="enc-pass-confirm"
              type="password"
              value={confirm.value}
              onChange={confirm.onChange}
              autoComplete="new-password"
              spellCheck={false}
              invalid={!!mismatch}
            />
          </Stack>
        )}
        {onGenerate && (
          <Button
            variant="secondary"
            leftIcon={<IconSparkles size="sm" />}
            onClick={onGenerate}
          >
            Generate passphrase
          </Button>
        )}
      </Inline>
      {mismatch && (
        <Alert status="danger">
          <AlertDescription>The passphrases do not match</AlertDescription>
        </Alert>
      )}
      {confirm && value && (
        <Meter
          label="Passphrase strength"
          value={Math.min(1, bits / 100)}
          valueText={`About ${Math.round(bits)} bits`}
        />
      )}
    </Stack>
  );
};
