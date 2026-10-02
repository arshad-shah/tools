'use client';

import { useState } from 'react';
import { IconInfo } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  Grid,
  Inline,
  Label,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { ControlsTab } from './components/ControlsTab';
import { DebugLog } from './components/DebugLog';
import { FileInfo } from './components/FileInfo';
import { LayoutControls } from './components/LayoutControls';
import { PlaybackControls } from './components/PlaybackControls';
import { Stage } from './components/Stage';
import { useRivePlayer } from './hooks/useRivePlayer';
import { PlayerError, type BackgroundColor } from './types';

export default function RiveAnimationPlayer() {
  const player = useRivePlayer();
  const { status, filename, fileSize, riveInfo, isPlaying } = player;

  const [background, setBackground] = useState<BackgroundColor>('transparent');
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('controls');

  return (
    <Container size="full">
      <Grid max={3} gap="4">
        <Box className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap gap="2">
                <Stack gap="0">
                  <CardTitle as="h3">Preview</CardTitle>
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
                  background={background}
                  previewRef={player.previewRef}
                  canvasRef={player.canvasRef}
                  handleDrop={player.handleDrop}
                  handleDragOver={player.handleDragOver}
                  handleDragEnter={player.handleDragEnter}
                  handleDragLeave={player.handleDragLeave}
                  load={player.load}
                />

                {status.error != null && (
                  <Alert status="danger">
                    <AlertTitle>Error loading animation</AlertTitle>
                    <AlertDescription>
                      {status.error === PlayerError.NoAnimation
                        ? "The uploaded file doesn't contain any animations."
                        : 'An error occurred while loading the animation.'}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="soft"
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

        <Card>
          <CardBody>
            <Tabs
              value={settingsTab}
              onValueChange={setSettingsTab}
              variant="line"
            >
              <TabsList aria-label="Settings">
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              <TabsContent value="controls">
                <Box className="pt-3">
                  <ControlsTab
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
                  />
                </Box>
              </TabsContent>
              <TabsContent value="appearance">
                <Box className="pt-3">
                  <Stack gap="3">
                    <Stack gap="2">
                      <Label>Background colour</Label>
                      <Select
                        value={background}
                        onValueChange={(v) =>
                          setBackground(v as BackgroundColor)
                        }
                        items={[
                          { value: 'transparent', label: 'Transparent' },
                          { value: 'white', label: 'White' },
                          { value: 'black', label: 'Black' },
                        ]}
                        aria-label="Background"
                      />
                    </Stack>
                  </Stack>
                </Box>
              </TabsContent>
              <TabsContent value="layout">
                <Box className="pt-3">
                  <LayoutControls
                    alignFitIndex={player.alignFitIndex}
                    setAlignFitIndex={player.setAlignFitIndex}
                  />
                </Box>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>
      </Grid>
    </Container>
  );
}
