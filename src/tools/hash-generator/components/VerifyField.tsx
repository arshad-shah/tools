import React from 'react';
import { Badge, Inline, Input, Label, Stack, Text } from '@/shared/ui';
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
      <Label htmlFor="hash-expected">Expected hash</Label>
      <Input
        id="hash-expected"
        value={value}
        onChange={onChange}
        placeholder="Paste a hash to compare (hex or Base64; sha256: prefixes are fine)"
        spellCheck={false}
        autoComplete="off"
      />
      {verdict && (
        <Inline gap="2" align="center" wrap role="status">
          {verdict.match ? (
            <Badge variant="soft" tone="success" size="sm">
              Match: {name(verdict.match)}
            </Badge>
          ) : (
            <>
              <Badge variant="soft" tone="danger" size="sm">
                No match
              </Badge>
              <Text size="sm" tone="subtle">
                {verdict.candidates.length
                  ? `Same length as ${verdict.candidates.map(name).join(', ')}`
                  : 'No selected algorithm has a digest of this length'}
              </Text>
            </>
          )}
        </Inline>
      )}
    </Stack>
  );
};
