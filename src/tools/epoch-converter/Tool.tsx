import React, { useMemo, useState } from 'react';
import {
  Inline,
  ShareButton,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useHandoff } from '@/shared/lib/handoff';
import { localZone } from '@/shared/lib/time';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { ConvertPanel } from './components/ConvertPanel';
import { MeetingPlanner } from './components/MeetingPlanner';
import { NowPanel } from './components/NowPanel';
import { WorldClock } from './components/WorldClock';
import { ZoneConverter } from './components/ZoneConverter';
import { useNow } from '@/shared/lib/use-now';
import { readInstant, type ReadAs } from './lib/read';
import { epochSettings } from './settings';
import { EPOCH_SHARE_VERSION, parseEpochShare, type EpochShare } from './share';

const EpochConverter: React.FC = () => {
  const [settings, update] = epochSettings.useSettings();
  const [text, setText] = useState('');
  const [readAs, setReadAs] = useState<ReadAs>('auto');
  const [zone, setZone] = useState(localZone);
  const [tab, setTab] = useState('convert');
  const now = useNow(1000);

  // A number handed over from another tool (JWT exp, Date "Compare across
  // zones") fills the input once.
  const handed = useHandoff(
    (p) => p.kind === 'text' && p.mime === 'text/plain',
  );
  const [takenHandoff, setTakenHandoff] = useState<typeof handed>(null);
  if (handed !== takenHandoff) {
    setTakenHandoff(handed);
    if (handed?.kind === 'text') setText(handed.text.trim());
  }

  // The world clock shows the converted instant, or now when there is none.
  const instant = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return readInstant(text, readAs, { zone, now }).epochMs;
    } catch {
      return null;
    }
  }, [text, readAs, zone, now]);

  const shareState = useShareableState<EpochShare>({
    toolId: 'epoch-converter',
    version: EPOCH_SHARE_VERSION,
    parse: (state) => parseEpochShare(state),
    select: () => ({ instant: instant ?? 0, zones: settings.zones }),
  });
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    setText(String(shareState.loaded.instant));
    setReadAs('unix-ms');
    if (shareState.loaded.zones.length)
      update({ zones: shareState.loaded.zones });
  }

  return (
    <Stack gap="6">
      <Inline justify="end">
        <ShareButton
          share={{
            ...shareState,
            canShare: shareState.canShare && instant !== null,
            reason:
              instant === null ? 'Enter a time to share it' : shareState.reason,
          }}
        />
      </Inline>
      <NowPanel now={now} onUse={(ms) => setText(String(ms))} />
      <Tabs value={tab} onValueChange={setTab} variant="soft">
        <TabsList aria-label="Converter sections">
          <TabsTrigger value="convert">Convert</TabsTrigger>
          <TabsTrigger value="zones">World clock</TabsTrigger>
          <TabsTrigger value="planner">Meeting planner</TabsTrigger>
        </TabsList>
        <TabsContent value="convert">
          <ConvertPanel
            text={text}
            onText={setText}
            readAs={readAs}
            onReadAs={setReadAs}
            zone={zone}
            onZone={setZone}
            now={now}
          />
        </TabsContent>
        <TabsContent value="zones">
          <Stack gap="6">
            <WorldClock
              instant={instant ?? now}
              zones={settings.zones}
              onZones={(zones) => update({ zones })}
            />
            <ZoneConverter zones={settings.zones} defaultZone={zone} />
          </Stack>
        </TabsContent>
        <TabsContent value="planner">
          <MeetingPlanner
            zones={settings.zones}
            workHours={settings.workHours}
            onWorkHours={(workHours) => update({ workHours })}
          />
        </TabsContent>
      </Tabs>
    </Stack>
  );
};

export default EpochConverter;
