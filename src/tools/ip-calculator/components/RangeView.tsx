import {
  Card,
  CodeBlock,
  Inline,
  List,
  Notice,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { formatAddress } from '../lib/addr';
import {
  formatNetwork,
  listRange,
  parseRange,
  rangeToCidrs,
} from '../lib/cidr';
import { checkMembership } from '../lib/convert';
import { count } from '../lib/format';
import { CopyCidrs } from './SubnetTable';

export interface RangeState {
  range: string;
  address: string;
}

/** Addresses listed at most. */
const LIST_CAP = 256;

const code = (s: string) => (
  <Text as="span" variant="code">
    {s}
  </Text>
);

/** A range or CIDR: is an address in it, its CIDRs and its addresses. */
export function RangeView({
  state,
  onChange,
}: {
  state: RangeState;
  onChange(patch: Partial<RangeState>): void;
}) {
  const range = useMemo(() => {
    if (!state.range.trim()) return null;
    try {
      const r = parseRange(state.range);
      return {
        r,
        cidrs: rangeToCidrs(r),
        list: listRange(r, LIST_CAP),
        error: null,
      };
    } catch (e) {
      return {
        r: null,
        cidrs: null,
        list: null,
        error: toToolError(e).message,
      };
    }
  }, [state.range]);

  const member = useMemo(() => {
    if (!range?.r || !state.address.trim()) return null;
    try {
      return { m: checkMembership(state.address, state.range), error: null };
    } catch (e) {
      return { m: null, error: toToolError(e).message };
    }
  }, [range, state.address, state.range]);

  const r = range?.r;
  return (
    <Card as="section" title="Ranges">
      <Stack gap="5">
        <TextField
          label="Range or CIDR"
          description="First and last address with a dash (10.0.0.5 - 10.0.0.20), or a CIDR."
          monospace
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="10.0.0.5 - 10.0.0.20"
          value={state.range}
          onChange={(v) => onChange({ range: v })}
          error={range?.error ?? undefined}
        />
        <TextField
          label="Is this address in the range?"
          monospace
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="10.0.0.9"
          value={state.address}
          onChange={(v) => onChange({ address: v })}
          error={member?.error ?? undefined}
        />
        {member?.m ? (
          <Notice
            tone={member.m.inside ? 'success' : 'warning'}
            title={member.m.inside ? 'In the range' : 'Not in the range'}
          >
            {`${formatAddress(member.m.address)} is ${member.m.inside ? '' : 'not '}between ${formatAddress({ version: member.m.range.version, value: member.m.range.start })} and ${formatAddress({ version: member.m.range.version, value: member.m.range.end })}.`}
          </Notice>
        ) : null}
        {r && range.cidrs && range.list ? (
          <Stack gap="5">
            <Stack gap="2">
              <Inline gap="3" align="center" justify="between" wrap>
                <Text weight="medium">
                  {`As CIDRs (${range.cidrs.length})`}
                </Text>
                <CopyCidrs networks={range.cidrs} label="Copy the CIDRs" />
              </Inline>
              <List
                label="CIDR blocks"
                marker="none"
                items={range.cidrs.map((n) => ({
                  id: formatNetwork(n),
                  label: code(formatNetwork(n)),
                }))}
              />
            </Stack>
            <Stack gap="2">
              <Text weight="medium">
                {range.list.total > BigInt(range.list.items.length)
                  ? `Addresses (the first ${range.list.items.length} of ${count(range.list.total)})`
                  : `Addresses (${count(range.list.total)})`}
              </Text>
              <CodeBlock
                title="Addresses in the range"
                code={range.list.items.join('\n')}
                maxLines={12}
                copyable
                size="sm"
              />
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
