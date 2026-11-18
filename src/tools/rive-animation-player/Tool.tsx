import {
  Card,
  Disclosure,
  Divider,
  Grid,
  GridItem,
  Heading,
  Notice,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@arshad-shah/cynosure';
import { useMemo, useState, type ReactNode } from 'react';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { useClipboard } from '@/shared/lib/clipboard';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { BindingPanel } from './components/BindingPanel';
import { ControlsTab } from './components/ControlsTab';
import { DebugLog } from './components/DebugLog';
import { EmbedSnippet, type SnippetRuntime } from './components/EmbedSnippet';
import { EventsLog } from './components/EventsLog';
import { ExportPanel } from './components/ExportPanel';
import { InfoPanel } from './components/InfoPanel';
import { LayoutControls } from './components/LayoutControls';
import { PlaybackControls } from './components/PlaybackControls';
import { Stage } from './components/Stage';
import { StagePanel, type DeviceChoice } from './components/StagePanel';
import { TextRunsPanel } from './components/TextRunsPanel';
import { Timeline } from './components/Timeline';
import { useRiveEvents } from './hooks/useRiveEvents';
import { useRivePlayer } from './hooks/useRivePlayer';
import { useSpeed } from './hooks/useSpeed';
import { useTimeline } from './hooks/useTimeline';
import { bindDefault } from './lib/binding';
import { embedSnippet } from './lib/snippet';
import { fromAlignFit, riveSettings, toAlignFit } from './settings';
import { PlayerError, PlayerState, type AlignFitIndex } from './types';

const TOOL_ID = 'rive-animation-player';

const PANELS = [
  { value: 'controls', label: 'Controls' },
  { value: 'stage', label: 'Stage' },
  { value: 'data', label: 'Data' },
  { value: 'info', label: 'Info' },
  { value: 'export', label: 'Export' },
] as const;
type Panel = (typeof PANELS)[number]['value'];

/** A titled block in the settings card; blocks after the first are ruled off. */
function Sections({ items }: { items: [string | null, ReactNode][] }) {
  return (
    <Stack gap="5">
      {items.map(([title, body], i) => (
        <Stack gap="4" key={title ?? i}>
          {i > 0 ? <Divider /> : null}
          {title ? (
            <Heading level={3} size="sm">
              {title}
            </Heading>
          ) : null}
          {body}
        </Stack>
      ))}
    </Stack>
  );
}

export default function RiveAnimationPlayer() {
  const [settings, updateSettings] = riveSettings.useSettings();
  const player = useRivePlayer(toAlignFit(settings));
  // A .riv dropped on a hub loads like a picked one (spec §5.3).
  useHandoffFiles((files) => void player.load(files[0]));
  const { status, filename, fileSize, isPlaying, loaded } = player;
  const rive = loaded?.rive ?? null;
  const active = status.current === PlayerState.Active && !!loaded;

  const [panel, setPanel] = useState<Panel>('controls');
  const [device, setDevice] = useState<DeviceChoice>('none');
  const [snippetRuntime, setSnippetRuntime] = useState<SnippetRuntime>('react');

  const speedSupported = useSpeed(rive, settings.speed);
  const linear =
    player.controller.active === 'animations'
      ? (player.animationList?.active ?? null)
      : null;
  const timeline = useTimeline(loaded, linear);
  const { events, clear: clearEvents } = useRiveEvents(rive);
  // Bind the default view-model instance on load, as the Rive editor shows it.
  const viewModel = useMemo(
    () => (loaded ? bindDefault(loaded.rive) : null),
    [loaded],
  );

  const setAlignFit = (idx: AlignFitIndex) => {
    player.setAlignFitIndex(idx);
    updateSettings(fromAlignFit(idx));
  };

  const stateMachine =
    player.stateMachineList?.active ||
    player.stateMachineList?.stateMachines[0];
  const snippet = embedSnippet({
    runtime: snippetRuntime,
    src: `/${filename ?? 'animation.riv'}`,
    artboard: player.selectedArtboard || undefined,
    stateMachine: stateMachine || undefined,
  });
  const { copy } = useClipboard();

  useToolCommands(TOOL_ID, [
    {
      id: 'copy',
      label: 'Copy embed snippet',
      shortcut: 'Mod+Shift+C',
      run: () => void copy(snippet),
      enabled: !!filename,
    },
    {
      id: 'clear',
      label: 'Clear events log',
      shortcut: 'Mod+Shift+X',
      run: clearEvents,
    },
    {
      id: 'prev-frame',
      label: 'Previous frame',
      shortcut: ',',
      run: () => timeline.step(-1),
      enabled: active && timeline.duration !== null,
    },
    {
      id: 'next-frame',
      label: 'Next frame',
      shortcut: '.',
      run: () => timeline.step(1),
      enabled: active && timeline.duration !== null,
    },
    {
      id: 'play',
      label: isPlaying ? 'Pause' : 'Play',
      run: player.togglePlayback,
      enabled: active,
    },
  ]);

  const panels: Record<Panel, [string | null, ReactNode][]> = {
    controls: [
      [
        null,
        <ControlsTab
          key="controls"
          controller={player.controller}
          setControllerState={player.setControllerState}
          artboards={player.artboards}
          selectedArtboard={player.selectedArtboard}
          setSelectedArtboard={player.selectArtboard}
          animationList={player.animationList}
          setActiveAnimation={player.setActiveAnimation}
          stateMachineList={player.stateMachineList}
          setActiveStateMachine={player.setActiveStateMachine}
          stateMachineInputs={player.stateMachineInputs}
          booleanValues={player.booleanValues}
          setBooleanValues={player.setBooleanValues}
          numberValues={player.numberValues}
          handleInputChange={player.handleInputChange}
        />,
      ],
    ],
    stage: [
      [
        'Background',
        <StagePanel
          key="stage"
          background={settings.background}
          checkerboard={settings.checkerboard}
          device={device}
          onChange={updateSettings}
          onDeviceChange={setDevice}
        />,
      ],
      [
        'Layout',
        <LayoutControls
          key="layout"
          alignFitIndex={player.alignFitIndex}
          setAlignFitIndex={setAlignFit}
        />,
      ],
    ],
    data: [
      ['Text runs', <TextRunsPanel key="text" loaded={loaded} />],
      ['Data binding', <BindingPanel key="binding" vmi={viewModel} />],
    ],
    info: [
      [
        'File',
        <InfoPanel
          key="file"
          loaded={loaded}
          selectedArtboard={player.selectedArtboard}
          fps={timeline.fps}
        />,
      ],
      [
        'Events',
        <EventsLog key="events" events={events} onClear={clearEvents} />,
      ],
    ],
    export: [
      [
        'Frame and video',
        <ExportPanel
          key="export"
          canvasRef={player.canvasRef}
          filename={filename}
          disabled={!active}
        />,
      ],
      [
        'Embed snippet',
        <EmbedSnippet
          key="embed"
          code={snippet}
          runtime={snippetRuntime}
          onRuntimeChange={setSnippetRuntime}
        />,
      ],
    ],
  };

  return (
    <Grid columns={{ base: 1, lg: 5 }} gap="6" align="start">
      <GridItem span={{ base: 'full', lg: 3 }}>
        <Card
          as="section"
          title="Preview"
          description={
            filename
              ? `${filename}${fileSize ? ` (${fileSize})` : ''}`
              : 'Choose a file to get started'
          }
          actions={
            <PlaybackControls
              filename={filename}
              isPlaying={isPlaying}
              status={status}
              togglePlayback={player.togglePlayback}
              reset={player.reset}
              timeline={timeline}
              speed={settings.speed}
              onSpeedChange={(speed) => updateSettings({ speed })}
              speedSupported={speedSupported}
            />
          }
        >
          <Stack gap="5">
            <Stage
              status={status}
              background={settings.background}
              checkerboard={settings.checkerboard}
              device={device}
              previewRef={player.previewRef}
              canvasRef={player.canvasRef}
              load={player.load}
            />
            {active ? <Timeline timeline={timeline} /> : null}
            {status.error != null ? (
              <Notice tone="danger" title="Error loading animation">
                {status.error === PlayerError.NoAnimation
                  ? "The uploaded file doesn't contain any animations."
                  : 'An error occurred while loading the animation.'}
              </Notice>
            ) : null}
            <Disclosure summary="Debug log" variant="line">
              <DebugLog
                debugLogs={player.debugLogs}
                onClear={player.clearDebugLogs}
              />
            </Disclosure>
          </Stack>
        </Card>
      </GridItem>
      <GridItem span={{ base: 'full', lg: 2 }}>
        <Card as="section" aria-label="Settings" data-testid="side-panel">
          <Tabs value={panel} onChange={(v) => setPanel(v as Panel)}>
            <TabList label="Settings">
              {PANELS.map((p) => (
                <Tab key={p.value} value={p.value}>
                  {p.label}
                </Tab>
              ))}
            </TabList>
            {PANELS.map((p) => (
              <TabPanel key={p.value} value={p.value}>
                <Sections items={panels[p.value]} />
              </TabPanel>
            ))}
          </Tabs>
        </Card>
      </GridItem>
    </Grid>
  );
}
