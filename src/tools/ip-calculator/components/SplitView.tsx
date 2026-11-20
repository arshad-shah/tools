import {
  Card,
  Inline,
  NumberField,
  SegmentedControl,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { BITS } from '../lib/addr';
import { formatNetwork, parseNetwork, type Network } from '../lib/cidr';
import { splitByCount, splitByPrefix, type SplitResult } from '../lib/plan';
import { count } from '../lib/format';
import { CopyCidrs, SubnetTable } from './SubnetTable';

export interface SplitState {
  network: string;
  by: 'count' | 'prefix';
  count: number | null;
  prefix: number | null;
}

interface Result {
  netError?: string;
  error?: string;
  base?: Network;
  split?: SplitResult;
}

/** Rows shown in the table; the rest are counted. */
const SHOWN = 256;

/** Split a network into N equal subnets, or into subnets of one prefix. */
export function SplitView({
  state,
  onChange,
}: {
  state: SplitState;
  onChange(patch: Partial<SplitState>): void;
}) {
  const result = useMemo((): Result | null => {
    if (!state.network.trim()) return null;
    let base: Network;
    try {
      const n = parseNetwork(state.network);
      base = { version: n.version, base: n.base, prefix: n.prefix };
    } catch (e) {
      return { netError: toToolError(e).message };
    }
    try {
      const split =
        state.by === 'count'
          ? splitByCount(base, state.count ?? 0, SHOWN)
          : splitByPrefix(base, state.prefix ?? -1, SHOWN);
      return { base, split };
    } catch (e) {
      return { base, error: toToolError(e).message };
    }
  }, [state]);

  const bits = result?.base ? BITS[result.base.version] : 128;
  return (
    <Stack gap="5">
      <Card as="section" title="Split a network">
        <Stack gap="4">
          <TextField
            label="Network to split"
            monospace
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="10.0.0.0/16"
            value={state.network}
            onChange={(network) => onChange({ network })}
            error={result?.netError}
          />
          <SegmentedControl
            label="Split by"
            value={state.by}
            onChange={(v) => onChange({ by: v as SplitState['by'] })}
            options={[
              { value: 'count', label: 'Number of subnets' },
              { value: 'prefix', label: 'New prefix length' },
            ]}
          />
          {state.by === 'count' ? (
            <NumberField
              label="Subnets needed"
              min={1}
              max={1_000_000}
              value={state.count}
              onChange={(c) => onChange({ count: c })}
              error={result?.error}
            />
          ) : (
            <NumberField
              label="New prefix length"
              min={0}
              max={bits}
              value={state.prefix}
              onChange={(p) => onChange({ prefix: p })}
              error={result?.error}
            />
          )}
        </Stack>
      </Card>
      {result?.split && result.base ? (
        <Card
          as="section"
          title={`${count(result.split.total)} subnets of /${result.split.prefix}`}
        >
          <Stack gap="4">
            <Inline gap="3" align="center" justify="between" wrap>
              <Text tone="muted">
                {result.split.total > BigInt(result.split.subnets.length)
                  ? `The first ${result.split.subnets.length} of ${count(result.split.total)} in ${formatNetwork(result.base)}`
                  : `All of ${formatNetwork(result.base)}`}
              </Text>
              <CopyCidrs
                networks={result.split.subnets}
                label="Copy the CIDRs"
              />
            </Inline>
            <SubnetTable
              caption="Subnets"
              rows={result.split.subnets.map((n, i) => ({
                id: String(i),
                name: String(i + 1),
                network: n,
              }))}
            />
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
