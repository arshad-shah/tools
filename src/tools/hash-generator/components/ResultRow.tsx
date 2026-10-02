import React from 'react';
import { Badge, Code, CopyButton, Heading, Inline, Stack } from '@/shared/ui';
import type { DigestInfo } from '@/shared/lib/crypto/digest';

/** "Broken for security" and "Not cryptographic", honestly labelled. */
export const DigestBadges: React.FC<{ info: DigestInfo }> = ({ info }) => (
  <>
    {info.broken && (
      <Badge variant="soft" tone="warning" size="xs">
        Broken for security
      </Badge>
    )}
    {info.nonCrypto && (
      <Badge variant="soft" tone="neutral" size="xs">
        Not cryptographic
      </Badge>
    )}
  </>
);

interface ResultRowProps {
  /** Test id suffix, e.g. `sha256` or `hmac-sha256`. */
  id: string;
  name: string;
  info?: DigestInfo;
  value: string;
  /** Verify state for this row, when an expected hash is entered. */
  match?: boolean;
}

export const ResultRow: React.FC<ResultRowProps> = ({
  id,
  name,
  info,
  value,
  match,
}) => {
  return (
    <Stack gap="1" className="border-b border-line py-2 last:border-b-0">
      <Inline justify="between" align="center" gap="2" wrap>
        <Inline gap="2" align="center" wrap>
          <Heading level={3} size="sm">
            {name}
          </Heading>
          {info && <DigestBadges info={info} />}
          {match !== undefined && (
            <Badge
              variant="soft"
              tone={match ? 'success' : 'neutral'}
              size="xs"
            >
              {match ? 'Match' : 'No match'}
            </Badge>
          )}
        </Inline>
        <CopyButton label={name} value={value} variant="text" />
      </Inline>
      <Code block data-testid={`hash-${id}`} className="break-all">
        {value}
      </Code>
    </Stack>
  );
};
