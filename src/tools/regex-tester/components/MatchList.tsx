import {
  Badge,
  CopyButton,
  Inline,
  Stack,
  Text,
  VirtualList,
} from '@arshad-shah/cynosure';
import type { Match } from '../lib/match';

const show = (s: string | undefined) => (s ? s : 'empty');

function MatchRow({ match, index }: { match: Match; index: number }) {
  return (
    <Stack gap="2" paddingBlock="3" paddingInline="4">
      <Inline gap="3" align="center" justify="between">
        <Inline gap="3" align="center">
          <Badge tone="accent" size="sm">
            Match {index + 1}
          </Badge>
          <Text as="span" size="xs" tone="muted">
            at {match.index} to {match.index + match.length}
          </Text>
        </Inline>
        <CopyButton
          size="sm"
          value={match.text}
          disabled={match.text === ''}
          labels={{ copy: `Copy match ${index + 1}`, copied: 'Copied' }}
        />
      </Inline>
      <Text variant="code" wrap="pre">
        {show(match.text)}
      </Text>
      {match.groups || match.namedGroups ? (
        <Inline gap="3" wrap>
          {match.groups?.map((g, i) => (
            <Text as="span" size="xs" tone="muted" key={`g${i}`}>
              Group {i + 1}{' '}
              <Text as="span" variant="code">
                {show(g)}
              </Text>
            </Text>
          ))}
          {Object.entries(match.namedGroups ?? {}).map(([name, v]) => (
            <Text as="span" size="xs" tone="muted" key={`n${name}`}>
              {name}{' '}
              <Text as="span" variant="code">
                {show(v)}
              </Text>
            </Text>
          ))}
        </Inline>
      ) : null}
    </Stack>
  );
}

/** Every match (virtualised), with its position, groups and named groups. */
export function MatchList({ matches }: { matches: Match[] }) {
  return (
    <VirtualList
      label="Matches"
      wrap
      items={matches}
      getKey={(m, i) => `${m.index}:${i}`}
      renderItem={(m, state) => <MatchRow match={m} index={state.index} />}
    />
  );
}
