import React from 'react';
import { StateMachineInput } from '@rive-app/react-canvas';
import { IconPause, IconPlay } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Button,
  Grid,
  Label,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import {
  PlayerState,
  type RiveAnimations,
  type RiveController,
  type RiveStateMachines,
  type Status,
} from '../types';
import { InputsPanel } from './InputsPanel';

/** Animation / state-machine pickers, their inputs and the play button. */
export function ControlsTab({
  controller,
  setControllerState,
  artboards,
  selectedArtboard,
  setSelectedArtboard,
  animationList,
  setActiveAnimation,
  stateMachineList,
  setActiveStateMachine,
  stateMachineInputs,
  booleanValues,
  setBooleanValues,
  numberValues,
  handleInputChange,
  status,
  isPlaying,
  togglePlayback,
}: {
  controller: RiveController;
  setControllerState: (state: 'animations' | 'state-machines') => void;
  artboards: string[];
  selectedArtboard: string;
  setSelectedArtboard: (artboard: string) => void;
  animationList: RiveAnimations | null;
  setActiveAnimation: (animation: string) => void;
  stateMachineList: RiveStateMachines | null;
  setActiveStateMachine: (stateMachine: string) => void;
  stateMachineInputs: StateMachineInput[];
  booleanValues: Record<string, boolean>;
  setBooleanValues: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  numberValues: Record<string, number>;
  handleInputChange: (
    input: StateMachineInput,
    value: boolean | number,
  ) => void;
  status: Status;
  isPlaying: boolean;
  togglePlayback: () => void;
}) {
  return (
    <Stack gap="4">
      <Tabs
        value={controller.active}
        onValueChange={(v) =>
          setControllerState(v as 'animations' | 'state-machines')
        }
        variant="soft"
        fullWidth
      >
        <TabsList aria-label="Controller">
          <TabsTrigger value="animations">Animations</TabsTrigger>
          <TabsTrigger value="state-machines">State machines</TabsTrigger>
        </TabsList>

        <TabsContent value="animations">
          <Stack gap="3" className="pt-3">
            {artboards.length > 1 && (
              <Stack gap="2">
                <Label>Artboard</Label>
                <Select
                  value={selectedArtboard}
                  onValueChange={setSelectedArtboard}
                  items={artboards.map((a) => ({ value: a, label: a }))}
                  aria-label="Artboard"
                />
              </Stack>
            )}
            {animationList && animationList.animations.length > 0 ? (
              <Grid max={2} gap="2">
                {animationList.animations.map((animation) => (
                  <Button
                    key={animation}
                    variant={
                      animationList.active === animation
                        ? 'primary'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => setActiveAnimation(animation)}
                    fullWidth
                  >
                    {animation}
                  </Button>
                ))}
              </Grid>
            ) : (
              <Alert status="info">
                <AlertDescription>No animations available.</AlertDescription>
              </Alert>
            )}
          </Stack>
        </TabsContent>

        <TabsContent value="state-machines">
          <Stack gap="3" className="pt-3">
            {stateMachineList && stateMachineList.stateMachines.length > 0 ? (
              <Stack gap="2">
                <Label>Active state machine</Label>
                <Select
                  value={stateMachineList.active}
                  onValueChange={setActiveStateMachine}
                  items={stateMachineList.stateMachines.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  aria-label="State machine"
                />
              </Stack>
            ) : (
              <Alert status="info">
                <AlertDescription>
                  No state machines available.
                </AlertDescription>
              </Alert>
            )}

            <InputsPanel
              stateMachineInputs={stateMachineInputs}
              stateMachineList={stateMachineList}
              booleanValues={booleanValues}
              setBooleanValues={setBooleanValues}
              numberValues={numberValues}
              handleInputChange={handleInputChange}
            />
          </Stack>
        </TabsContent>
      </Tabs>

      {controller.active === 'animations' && (
        <Button
          variant="secondary"
          fullWidth
          disabled={status.current !== PlayerState.Active}
          leftIcon={
            isPlaying ? <IconPause size="sm" /> : <IconPlay size="sm" />
          }
          onClick={togglePlayback}
        >
          {status.current !== PlayerState.Active
            ? 'Play / Pause'
            : isPlaying
              ? 'Pause'
              : 'Play'}
        </Button>
      )}
    </Stack>
  );
}
