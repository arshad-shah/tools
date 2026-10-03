'use client';

import { useMemo, useState } from 'react';
import { IconInfo } from '@/shared/ui/icons';

import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  ErrorState,
  Grid,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { ToolError } from '@/shared/lib/errors';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { useClipboard } from '@/shared/lib/clipboard';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { BindingPanel } from './components/BindingPanel';
import { ControlsTab } from './components/ControlsTab';
import { DebugLog } from './components/DebugLog';
import { EmbedSnippet, type SnippetRuntime } from './components/EmbedSnippet';
import { EventsLog } from './components/EventsLog';
import { ExportPanel } from './components/ExportPanel';
import { FileInfo } from './components/FileInfo';
import { InfoPanel } from './components/InfoPanel';
import { LayoutControls } from './components/LayoutControls';
import { PlaybackControls } from './components/PlaybackControls';
import { Section, SidePanel } from './components/SidePanel';
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

export default function RiveAnimationPlayer() {
  const [settings, updateSettings] = riveSettings.useSettings();
  const player = useRivePlayer(toAlignFit(settings));
  // A .riv dropped on a hub loads like a picked one (spec §5.3).
  useHandoffFiles((files) => void player.load(files[0]));
  const { status, filename, fileSize, riveInfo, isPlaying, loaded } = player;
  const rive = loaded?.rive ?? null;
  const active = status.current === PlayerState.Active && !!loaded;

  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
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

  return (
    <Container size="full" className="px-0 sm:px-0">
      <Grid max={3} gap="4">
        <Box className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap gap="2">
                <Stack gap="0">
                  <CardTitle as="h2">Preview</CardTitle>
                  <Text size="sm" tone="subtle">
                    {filename ? (
                      <>
                        {filename}
                        {fileSize && (
                          <>
                            {' '}
                            <Text as="span" size="sm" tone="subtle">
                              ({fileSize})
                            </Text>
                          </>
                        )}
                      </>
                    ) : (
                      'Choose a file to get started'
                    )}
                  </Text>
                </Stack>
                <PlaybackControls
                  filename={filename}
                  isPlaying={isPlaying}
                  status={status}
                  togglePlayback={player.togglePlayback}
                  reset={player.reset}
                />
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="3">
                <FileInfo
                  filename={filename}
                  fileSize={fileSize}
                  riveInfo={riveInfo}
                />

                <Stage
                  status={status}
                  background={settings.background}
                  checkerboard={settings.checkerboard}
                  device={device}
                  previewRef={player.previewRef}
                  canvasRef={player.canvasRef}
                  handleDrop={player.handleDrop}
                  handleDragOver={player.handleDragOver}
                  handleDragEnter={player.handleDragEnter}
                  handleDragLeave={player.handleDragLeave}
                  load={player.load}
                />

                {active && (
                  <Timeline
                    timeline={timeline}
                    speed={settings.speed}
                    onSpeedChange={(speed) => updateSettings({ speed })}
                    speedSupported={speedSupported}
                    disabled={!active}
                  />
                )}

                {status.error != null && (
                  <ErrorState
                    title="Error loading animation"
                    error={
                      new ToolError(
                        'INVALID_FILE',
                        status.error === PlayerError.NoAnimation
                          ? "The uploaded file doesn't contain any animations."
                          : 'An error occurred while loading the animation.',
                      )
                    }
                  />
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconInfo size="sm" />}
                  onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                  fullWidth
                >
                  {isDebugPanelOpen ? 'Hide debug panel' : 'Show debug panel'}
                </Button>

                {isDebugPanelOpen ? (
                  <DebugLog
                    debugLogs={player.debugLogs}
                    onClear={player.clearDebugLogs}
                  />
                ) : null}
              </Stack>
            </CardBody>
          </Card>
        </Box>

        <SidePanel
          tabs={{
            controls: [
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
                status={status}
                isPlaying={isPlaying}
                togglePlayback={player.togglePlayback}
              />,
            ],
            stage: [
              <Section key="stage" title="Stage">
                <StagePanel
                  background={settings.background}
                  checkerboard={settings.checkerboard}
                  device={device}
                  onChange={updateSettings}
                  onDeviceChange={setDevice}
                />
              </Section>,
              <Section key="layout" title="Layout">
                <LayoutControls
                  alignFitIndex={player.alignFitIndex}
                  setAlignFitIndex={setAlignFit}
                />
              </Section>,
            ],
            data: [
              <Section key="text" title="Text runs">
                <TextRunsPanel loaded={loaded} />
              </Section>,
              <Section key="binding" title="Data binding">
                <BindingPanel vmi={viewModel} />
              </Section>,
            ],
            info: [
              <Section key="file" title="File">
                <InfoPanel
                  loaded={loaded}
                  selectedArtboard={player.selectedArtboard}
                  fps={timeline.fps}
                />
              </Section>,
              <Section key="events" title="Events">
                <EventsLog events={events} onClear={clearEvents} />
              </Section>,
            ],
            export: [
              <Section key="export" title="Export">
                <ExportPanel
                  canvasRef={player.canvasRef}
                  filename={filename}
                  disabled={!active}
                />
              </Section>,
              <Section key="embed" title="Embed snippet">
                <EmbedSnippet
                  code={snippet}
                  runtime={snippetRuntime}
                  onRuntimeChange={setSnippetRuntime}
                />
              </Section>,
            ],
          }}
        />
      </Grid>
    </Container>
  );
}
