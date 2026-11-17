import {
  Badge,
  CopyButton,
  DescriptionList,
  Inline,
  Text,
} from '@arshad-shah/cynosure';
import React from 'react';
import type { DigestInfo } from '@/shared/lib/crypto/digest';

/** "Broken for security" and "Not cryptographic", honestly labelled. */
export const DigestBadges: React.FC<{ info: DigestInfo }> = ({ info }) => (
  <>
    {info.broken ? (
      <Badge tone="warning" size="sm">
        Broken for security
      </Badge>
    ) : null}
    {info.nonCrypto ? (
      <Badge tone="neutral" size="sm">
        Not cryptographic
      </Badge>
    ) : null}
  </>
);

export interface DigestResult {
  /** Element id suffix, e.g. `sha256` or `hmac-sha256` (`hash-<id>`). */
  id: string;
  name: string;
  info?: DigestInfo;
  value: string;
  /** Verify state, when an expected hash is entered. */
  match?: boolean;
}

/** Digests as a list: the name and its labels, then the value with Copy. */
export const ResultList: React.FC<{ results: DigestResult[] }> = ({
  results,
}) => (
  <DescriptionList
    layout="stacked"
    divided
    items={results.map((r) => ({
      id: r.id,
      term: (
        <Inline gap="2" align="center" wrap as="span">
          <Text as="span" weight="medium">
            {r.name}
          </Text>
          {r.info ? <DigestBadges info={r.info} /> : null}
          {r.match !== undefined ? (
            <Badge tone={r.match ? 'success' : 'neutral'} size="sm">
              {r.match ? 'Match' : 'No match'}
            </Badge>
          ) : null}
        </Inline>
      ),
      detail: (
        <Inline gap="2" align="start" justify="between" as="span">
          <Text as="span" variant="code" wrap="break" id={`hash-${r.id}`}>
            {r.value}
          </Text>
          <CopyButton
            size="sm"
            value={r.value}
            labels={{ copy: `Copy ${r.name}` }}
          />
        </Inline>
      ),
    }))}
  />
);
