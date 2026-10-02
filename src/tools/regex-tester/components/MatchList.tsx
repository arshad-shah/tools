import React from 'react';
import {
  Badge,
  Code,
  CopyButton,
  Inline,
  Stack,
  Text,
  VirtualList,
} from '@/shared/ui';
import type { Match } from '../lib/match';

const show = (s: string | undefined) => (s ? s : 'empty');

const MatchRow: React.FC<{
  match: Match;
  index: number;
}> = ({ match, index }) => (
  <Stack gap="1" className="border-b border-line px-3 py-2">
    <Inline gap="2" align="center" justify="between">
      <Inline gap="2" align="center">
        <Badge variant="soft" tone="accent" size="sm">
          Match {index + 1}
        </Badge>
        <Text as="span" size="xs" tone="subtle">
          at {match.index} to {match.index + match.length}
        </Text>
      </Inline>
      <CopyButton
        label={`match ${index + 1}`}
        value={match.text}
        disabled={match.text === ''}
      />
    </Inline>
    <Code className="self-start whitespace-pre-wrap">{show(match.text)}</Code>
    {match.groups || match.namedGroups ? (
      <Inline gap="2" wrap>
        {match.groups?.map((g, i) => (
          <Text as="span" size="xs" tone="muted" key={`g${i}`}>
            Group {i + 1} <Code>{show(g)}</Code>
          </Text>
        ))}
        {Object.entries(match.namedGroups ?? {}).map(([name, v]) => (
          <Text as="span" size="xs" tone="muted" key={`n${name}`}>
            {name} <Code>{show(v)}</Code>
          </Text>
        ))}
      </Inline>
    ) : null}
  </Stack>
);

const rowHeight = (m: Match) => 64 + (m.groups || m.namedGroups ? 24 : 0);

/** Every match (virtualised), with its position, groups and named groups. */
export const MatchList: React.FC<{
  matches: Match[];
}> = ({ matches }) => (
  <VirtualList
    items={matches}
    estimateSize={(i) => rowHeight(matches[i])}
    measure
    maxHeight={360}
    ariaLabel="Matches"
    getKey={(m, i) => `${m.index}:${i}`}
    className="rounded-md border border-line"
    renderItem={(m, i) => <MatchRow match={m} index={i} />}
  />
);
