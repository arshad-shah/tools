import {
  Badge,
  Card,
  Inline,
  List,
  Notice,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { formatNetwork } from '../lib/cidr';
import { overlaps, parseCidrList, summarize } from '../lib/plan';
import { CopyCidrs } from './SubnetTable';

const KIND_TEXT = {
  same: 'is the same network as',
  contains: 'contains',
  inside: 'is inside',
} as const;

/** Summarise a list of CIDRs into the fewest blocks, and find overlaps. */
export function SummariseView({
  text,
  onText,
}: {
  text: string;
  onText(text: string): void;
}) {
  const parsed = useMemo(() => parseCidrList(text), [text]);
  const summary = useMemo(
    () => summarize(parsed.entries.map((e) => e.network)),
    [parsed],
  );
  const clashes = useMemo(() => overlaps(parsed.entries), [parsed]);
  const adjusted = parsed.entries.filter((e) => e.adjusted);
  const has = parsed.entries.length > 0;

  return (
    <Stack gap="5">
      <Card as="section" title="Summarise and check overlaps">
        <Stack gap="4">
          <TextArea
            label="CIDR list"
            description="One per line, or separated by commas or spaces. IPv4 and IPv6 can be mixed; # starts a comment."
            monospace
            rows={6}
            maxRows={18}
            spellCheck={false}
            placeholder={'10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23'}
            value={text}
            onChange={onText}
          />
          {parsed.problems.length ? (
            <Notice tone="warning" title="Some entries were skipped">
              <List
                label="Skipped entries"
                items={parsed.problems.map((p, i) => ({
                  id: String(i),
                  label: `Line ${p.line} (${p.text}): ${p.message}`,
                }))}
              />
            </Notice>
          ) : null}
          {adjusted.length ? (
            <Notice tone="info" title="Host bits were cleared">
              {`${adjusted.map((e) => `${e.text} is read as ${formatNetwork(e.network)}`).join('; ')}.`}
            </Notice>
          ) : null}
        </Stack>
      </Card>
      {has ? (
        <Card as="section" title="Summary">
          <Stack gap="4">
            <Inline gap="3" align="center" justify="between" wrap>
              <Text tone="muted">
                {`${parsed.entries.length} entries become ${summary.length} ${summary.length === 1 ? 'block' : 'blocks'}`}
              </Text>
              <CopyCidrs networks={summary} label="Copy the summary" />
            </Inline>
            <List
              label="Summarised blocks"
              marker="none"
              items={summary.map((n) => ({
                id: formatNetwork(n),
                label: (
                  <Text as="span" variant="code">
                    {formatNetwork(n)}
                  </Text>
                ),
              }))}
            />
          </Stack>
        </Card>
      ) : null}
      {has ? (
        <Card as="section" title="Overlaps">
          {clashes.length ? (
            <List
              label="Overlapping entries"
              items={clashes.map((c, i) => ({
                id: String(i),
                label: (
                  <Inline gap="2" align="center" wrap as="span">
                    <Badge
                      size="sm"
                      tone={c.kind === 'same' ? 'warning' : 'danger'}
                    >
                      {c.kind === 'same' ? 'Duplicate' : 'Overlap'}
                    </Badge>
                    <Text as="span">
                      {`${formatNetwork(c.a.network)} (line ${c.a.line}) ${KIND_TEXT[c.kind]} ${formatNetwork(c.b.network)} (line ${c.b.line})`}
                    </Text>
                  </Inline>
                ),
              }))}
            />
          ) : (
            <Text tone="muted">No two entries share an address.</Text>
          )}
        </Card>
      ) : null}
    </Stack>
  );
}
