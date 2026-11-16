import { Badge, DescriptionList, Inline, Text } from '@arshad-shah/cynosure';
import { formatTime, getClaimLabel } from '../lib/claims';
import type { ClaimEntries } from '../lib/categorize';
import { formatDuration, relative } from '../lib/status';

const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf', 'auth_time']);

/**
 * A claim's value as text: strings as they are, a list of plain values
 * comma-separated, anything else as JSON.
 */
const claimText = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value) && value.every((v) => typeof v !== 'object')
      ? value.join(', ')
      : JSON.stringify(value);

/**
 * Claims as a description list: the claim's plain name and key, then its
 * value (a time claim also as a date and how far from now).
 */
export function ClaimList({
  claims,
  nowSec,
  expired,
}: {
  claims: ClaimEntries;
  nowSec: number;
  /** exp has passed (with the clock skew). */
  expired?: boolean;
}) {
  return (
    <DescriptionList
      size="sm"
      divided
      items={claims.map(([key, value]) => ({
        id: key,
        term: (
          <Inline gap="2" align="baseline" wrap as="span">
            <Text as="span">{getClaimLabel(key)}</Text>
            <Text as="span" variant="code" size="xs" tone="muted">
              {key}
            </Text>
          </Inline>
        ),
        detail:
          TIME_CLAIMS.has(key) && typeof value === 'number' ? (
            <Inline gap="3" align="center" wrap as="span">
              <Text as="span">{formatTime(value)}</Text>
              {key === 'exp' ? (
                <Badge size="sm" tone={expired ? 'danger' : 'success'}>
                  {expired
                    ? 'Expired'
                    : `${formatDuration(value - nowSec)} left`}
                </Badge>
              ) : (
                <Text as="span" size="sm" tone="muted">
                  {relative(value, nowSec, key === 'nbf' ? 'valid' : 'issued')}
                </Text>
              )}
            </Inline>
          ) : (
            <Text as="span" variant="code" wrap="break">
              {claimText(value)}
            </Text>
          ),
      }))}
    />
  );
}
