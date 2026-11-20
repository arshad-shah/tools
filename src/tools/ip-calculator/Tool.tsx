import { Grid, Inline, SegmentedControl, Stack } from '@arshad-shah/cynosure';
import { useState } from 'react';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { ConvertView } from './components/ConvertView';
import { RangeView, type RangeState } from './components/RangeView';
import { SplitView, type SplitState } from './components/SplitView';
import { SubnetPanel } from './components/SubnetPanel';
import { SummariseView } from './components/SummariseView';
import { VlsmView, type VlsmState } from './components/VlsmView';
import { ipSettings, type IpTab, type PlanMode } from './settings';

const SAMPLE_SUMMARY =
  '10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23\n10.0.1.128/25\n192.168.10.0/24';
const SAMPLE_NEEDS = 'Servers 100\nOffice 50\nGuests 20\nLink 2';

/**
 * IP and Subnet Calculator: a network's facts, splitting and planning,
 * and address conversions, for IPv4 and IPv6. All maths is BigInt.
 */
export default function IpCalculator() {
  const [settings, update] = ipSettings.useSettings();
  const [subnet, setSubnet] = useState('192.168.1.10/24');
  const [split, setSplit] = useState<SplitState>({
    network: '10.0.0.0/16',
    by: 'count',
    count: 4,
    prefix: 24,
  });
  const [vlsmState, setVlsm] = useState<VlsmState>({
    network: '192.168.0.0/24',
    needs: SAMPLE_NEEDS,
  });
  const [list, setList] = useState(SAMPLE_SUMMARY);
  const [address, setAddress] = useState('192.168.1.1');
  const [range, setRange] = useState<RangeState>({
    range: '10.0.0.5 - 10.0.0.20',
    address: '10.0.0.9',
  });

  useToolCommands('ip-calculator', [
    {
      id: 'subnet',
      label: 'Subnet',
      run: () => update({ tab: 'subnet' }),
    },
    {
      id: 'plan',
      label: 'Split and plan',
      run: () => update({ tab: 'plan' }),
    },
    {
      id: 'address',
      label: 'Address tools',
      run: () => update({ tab: 'address' }),
    },
  ]);

  return (
    <Stack gap="6">
      <Inline>
        <SegmentedControl
          label="Calculator"
          value={settings.tab}
          onChange={(v) => update({ tab: v as IpTab })}
          options={[
            { value: 'subnet', label: 'Subnet' },
            { value: 'plan', label: 'Split and plan' },
            { value: 'address', label: 'Address tools' },
          ]}
        />
      </Inline>
      {settings.tab === 'subnet' ? (
        <SubnetPanel text={subnet} onText={setSubnet} />
      ) : null}
      {settings.tab === 'plan' ? (
        <Stack gap="5">
          <Inline>
            <SegmentedControl
              label="Planner"
              size="sm"
              value={settings.plan}
              onChange={(v) => update({ plan: v as PlanMode })}
              options={[
                { value: 'split', label: 'Split' },
                { value: 'vlsm', label: 'VLSM' },
                { value: 'summarise', label: 'Summarise and overlaps' },
              ]}
            />
          </Inline>
          {settings.plan === 'split' ? (
            <SplitView
              state={split}
              onChange={(p) => setSplit((s) => ({ ...s, ...p }))}
            />
          ) : null}
          {settings.plan === 'vlsm' ? (
            <VlsmView
              state={vlsmState}
              onChange={(p) => setVlsm((s) => ({ ...s, ...p }))}
            />
          ) : null}
          {settings.plan === 'summarise' ? (
            <SummariseView text={list} onText={setList} />
          ) : null}
        </Stack>
      ) : null}
      {settings.tab === 'address' ? (
        <Grid columns={2} minItemWidth="22rem" gap="5" align="start">
          <ConvertView text={address} onText={setAddress} />
          <RangeView
            state={range}
            onChange={(p) => setRange((s) => ({ ...s, ...p }))}
          />
        </Grid>
      ) : null}
    </Stack>
  );
}
