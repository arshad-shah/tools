import { Badge, Inline, Stack, Text, TextField } from '@arshad-shah/cynosure';
import React from 'react';
import { digestInfo, type DigestId } from '@/shared/lib/crypto/digest';
import { matchExpected } from '../lib/verify';

interface VerifyFieldProps {
  value: string;
  onChange(v: string): void;
  /** Hex results by algorithm. */
  results: Partial<Record<DigestId, string>>;
}

/** "Expected hash": names the matching algorithm, by value or by length. */
export const VerifyField: React.FC<VerifyFieldProps> = ({
  value,
  onChange,
  results,
}) => {
  const verdict = value.trim() ? matchExpected(value, results) : null;
  const name = (id: DigestId) => digestInfo(id).name;
  return (
    <Stack gap="2">
      <TextField
        label="Expected hash"
        monospace
        description="Paste a hash to compare: hex or Base64, sha256: prefixes are fine."
        value={value}
        onChange={onChange}
        spellCheck={false}
        autoComplete="off"
        clearable
      />
      {verdict ? (
        <Inline gap="2" align="center" wrap aria-live="polite">
          {verdict.match ? (
            <Badge tone="success">{`Match: ${name(verdict.match)}`}</Badge>
          ) : (
            <>
              <Badge tone="danger">No match</Badge>
              <Text size="sm" tone="muted">
                {verdict.candidates.length
                  ? `Same length as ${verdict.candidates.map(name).join(', ')}`
                  : 'No selected algorithm has a digest of this length'}
              </Text>
            </>
          )}
        </Inline>
      ) : null}
    </Stack>
  );
};
