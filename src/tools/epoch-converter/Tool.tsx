import { Inline, SegmentedControl, Stack } from '@arshad-shah/cynosure';
import React, { useMemo, useState } from 'react';
import { ShareButton, ToolActions, TransformLayout } from '@/app/ui/transform';
import { useHandoff } from '@/shared/lib/handoff';
import { localZone } from '@/shared/lib/time';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { ConvertPanel } from './components/ConvertPanel';
import { MeetingPlanner } from './components/MeetingPlanner';
import { WorldClock } from './components/WorldClock';
import { ZoneConverter } from './components/ZoneConverter';
import { useNow } from '@/shared/lib/use-now';
import { readInstant, type ReadAs } from './lib/read';
import { epochSettings } from './settings';
import { EPOCH_SHARE_VERSION, parseEpochShare, type EpochShare } from './share';

type Section = 'convert' | 'zones' | 'planner';

/**
 * Epoch & Time Zone Converter (redesign spec, transform pattern): a time in
 * any form beside every way to write it, a world clock with a zone
 * converter, and a meeting planner.
 */
const EpochConverter: React.FC = () => {
  const [settings, update] = epochSettings.useSettings();
  const [text, setText] = useState('');
  const [readAs, setReadAs] = useState<ReadAs>('auto');
  const [zone, setZone] = useState(localZone);
  const [tab, setTab] = useState<Section>('convert');
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
      <ToolActions>
        <ShareButton
          share={{
            ...shareState,
            canShare: shareState.canShare && instant !== null,
            reason:
              instant === null ? 'Enter a time to share it' : shareState.reason,
          }}
        />
      </ToolActions>
      <Inline>
        <SegmentedControl
          label="Converter sections"
          value={tab}
          onChange={(v) => setTab(v as Section)}
          options={[
            { value: 'convert', label: 'Convert' },
            { value: 'zones', label: 'World clock' },
            { value: 'planner', label: 'Meeting planner' },
          ]}
        />
      </Inline>
      {tab === 'convert' ? (
        <ConvertPanel
          text={text}
          onText={setText}
          readAs={readAs}
          onReadAs={setReadAs}
          zone={zone}
          onZone={setZone}
          now={now}
          showNow
        />
      ) : null}
      {tab === 'zones' ? (
        <TransformLayout
          defaultSize={50}
          start={
            <WorldClock
              instant={instant ?? now}
              zones={settings.zones}
              onZones={(zones) => update({ zones })}
            />
          }
          end={<ZoneConverter zones={settings.zones} defaultZone={zone} />}
        />
      ) : null}
      {tab === 'planner' ? (
        <MeetingPlanner
          zones={settings.zones}
          workHours={settings.workHours}
          onWorkHours={(workHours) => update({ workHours })}
        />
      ) : null}
    </Stack>
  );
};

export default EpochConverter;
