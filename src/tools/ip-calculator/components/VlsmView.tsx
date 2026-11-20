import {
  Card,
  Inline,
  List,
  Notice,
  Stack,
  Text,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { formatNetwork, parseNetwork, sizeOf } from '../lib/cidr';
import { parseNeeds, vlsm, type VlsmPlan } from '../lib/plan';
import { count } from '../lib/format';
import { CopyCidrs, SubnetTable } from './SubnetTable';

export interface VlsmState {
  network: string;
  needs: string;
}

interface Result {
  netError?: string;
  error?: string;
  plan?: VlsmPlan;
  total?: bigint;
}

/** VLSM planner: host counts in, aligned subnets and the free space out. */
export function VlsmView({
  state,
  onChange,
}: {
  state: VlsmState;
  onChange(patch: Partial<VlsmState>): void;
}) {
  const parsedNeeds = useMemo(() => parseNeeds(state.needs), [state.needs]);
  const result = useMemo((): Result | null => {
    if (!state.network.trim()) return null;
    let n;
    try {
      n = parseNetwork(state.network);
    } catch (e) {
      return { netError: toToolError(e).message };
    }
    if (!parsedNeeds.needs.length) return {};
    const base = { version: n.version, base: n.base, prefix: n.prefix };
    try {
      return {
        plan: vlsm(base, parsedNeeds.needs),
        total: sizeOf(n.version, n.prefix),
      };
    } catch (e) {
      return { error: toToolError(e).message };
    }
  }, [state.network, parsedNeeds]);

  const plan = result?.plan;
  const total = result?.total ?? 0n;

  return (
    <Stack gap="5">
      <Card as="section" title="VLSM planner">
        <Stack gap="4">
          <TextField
            label="Network to divide"
            monospace
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="192.168.0.0/24"
            value={state.network}
            onChange={(network) => onChange({ network })}
            error={result?.netError ?? undefined}
          />
          <TextArea
            label="Subnets and their host counts"
            description="One per line: a name and how many hosts, such as Servers 100. The largest is placed first."
            monospace
            rows={5}
            maxRows={14}
            spellCheck={false}
            placeholder={'Servers 100\nOffice 50\nLink 2'}
            value={state.needs}
            onChange={(needs) => onChange({ needs })}
          />
          {parsedNeeds.problems.length ? (
            <Notice tone="warning" title="Some lines were skipped">
              <List
                label="Skipped lines"
                items={parsedNeeds.problems.map((p) => ({
                  id: String(p.line),
                  label: `Line ${p.line} (${p.text}): ${p.message}`,
                }))}
              />
            </Notice>
          ) : null}
          {result?.error ? (
            <Notice tone="danger" title="The plan does not fit">
              {result.error}
            </Notice>
          ) : null}
        </Stack>
      </Card>
      {plan ? (
        <Card as="section" title="Plan">
          <Stack gap="4">
            <Inline gap="3" align="center" justify="between" wrap>
              <Text tone="muted">
                {`${count(plan.used)} of ${count(total)} addresses allocated`}
              </Text>
              <CopyCidrs
                networks={plan.allocations.map((a) => a.network)}
                label="Copy the CIDRs"
              />
            </Inline>
            <SubnetTable
              caption="Allocated subnets"
              nameHeader="Subnet"
              rows={plan.allocations.map((a, i) => ({
                id: String(i),
                name: a.name,
                detail: `${a.hosts} asked`,
                network: a.network,
              }))}
            />
            <Stack gap="2">
              <Text weight="medium">Free space</Text>
              {plan.free.length ? (
                <List
                  label="Free blocks"
                  marker="none"
                  items={plan.free.map((n) => ({
                    id: formatNetwork(n),
                    label: (
                      <Text as="span" variant="code">
                        {formatNetwork(n)}
                      </Text>
                    ),
                  }))}
                />
              ) : (
                <Text tone="muted">None: the network is fully used.</Text>
              )}
            </Stack>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
