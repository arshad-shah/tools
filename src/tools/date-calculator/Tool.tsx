import React, { useState } from 'react';
import {
  Inline,
  ShareButton,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { localZone } from '@/shared/lib/time';
import { ArithmeticTab } from './components/ArithmeticTab';
import { BusinessTab } from './components/BusinessTab';
import { DifferenceTab } from './components/DifferenceTab';
import { useNow } from './hooks/useNow';
import type { DateOp } from './lib/arith';
import type { DateValueInput } from './lib/read';
import { dateSettings } from './settings';
import {
  DATE_SHARE_VERSION,
  parseDateShare,
  type DateShare,
  type DateTab,
} from './share';
import { parseOps, serializeOps } from './lib/ops';

const DateCalculator: React.FC = () => {
  const [settings, update] = dateSettings.useSettings();
  const now = useNow();
  const [tab, setTab] = useState<DateTab>('difference');
  const field = (text: string): DateValueInput => ({
    text,
    zone: settings.defaultZone || localZone(),
  });
  const [diffStart, setDiffStart] = useState(() => field('today'));
  const [diffEnd, setDiffEnd] = useState(() => field('today + 30d'));
  const [base, setBase] = useState(() => field('today'));
  const [ops, setOps] = useState<DateOp[]>([{ amount: 1, unit: 'month' }]);
  const [bizStart, setBizStart] = useState(() => field('today'));
  const [bizEnd, setBizEnd] = useState(() => field('today + 4w'));
  // Holidays are data: kept in memory (and in share links), never saved.
  const [holidays, setHolidays] = useState<string[]>([]);

  const shareState = useShareableState<DateShare>({
    toolId: 'date-calculator',
    version: DATE_SHARE_VERSION,
    parse: (state) => parseDateShare(state),
    select: () => ({
      tab,
      inputs: {
        diffStart: diffStart.text,
        diffEnd: diffEnd.text,
        base: base.text,
        ops: serializeOps(ops),
        bizStart: bizStart.text,
        bizEnd: bizEnd.text,
      },
      zone: diffStart.zone,
      workweek: settings.workweek,
      holidays,
    }),
  });
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    const l = shareState.loaded;
    const f = (text: string | undefined, fallback: DateValueInput) =>
      text === undefined ? fallback : { text, zone: l.zone || fallback.zone };
    setTab(l.tab);
    setDiffStart(f(l.inputs.diffStart, diffStart));
    setDiffEnd(f(l.inputs.diffEnd, diffEnd));
    setBase(f(l.inputs.base, base));
    setBizStart(f(l.inputs.bizStart, bizStart));
    setBizEnd(f(l.inputs.bizEnd, bizEnd));
    if (l.inputs.ops !== undefined) setOps(parseOps(l.inputs.ops));
    setHolidays(l.holidays);
    update({ workweek: l.workweek });
  }

  return (
    <Stack gap="4">
      <Inline justify="end">
        <ShareButton share={shareState} />
      </Inline>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as DateTab)}
        variant="soft"
      >
        <TabsList aria-label="Calculations">
          <TabsTrigger value="difference">Difference</TabsTrigger>
          <TabsTrigger value="arithmetic">Add or subtract</TabsTrigger>
          <TabsTrigger value="business">Business days</TabsTrigger>
        </TabsList>
        <TabsContent value="difference">
          <DifferenceTab
            start={diffStart}
            end={diffEnd}
            onStart={setDiffStart}
            onEnd={setDiffEnd}
            now={now}
          />
        </TabsContent>
        <TabsContent value="arithmetic">
          <ArithmeticTab
            base={base}
            onBase={setBase}
            ops={ops}
            onOps={setOps}
            overflow={settings.overflow}
            onOverflow={(overflow) => update({ overflow })}
            workweek={settings.workweek}
            holidays={holidays}
            now={now}
          />
        </TabsContent>
        <TabsContent value="business">
          <BusinessTab
            start={bizStart}
            end={bizEnd}
            onStart={setBizStart}
            onEnd={setBizEnd}
            workweek={settings.workweek}
            onWorkweek={(workweek) => update({ workweek })}
            holidays={holidays}
            onHolidays={setHolidays}
            now={now}
          />
        </TabsContent>
      </Tabs>
    </Stack>
  );
};

export default DateCalculator;
