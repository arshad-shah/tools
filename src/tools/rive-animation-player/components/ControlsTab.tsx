import {
  EmptyState,
  SegmentedControl,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import React from 'react';
import { StateMachineInput } from '@/shared/lib/rive-runtime';
import {
  type RiveAnimations,
  type RiveController,
  type RiveStateMachines,
} from '../types';
import { InputsPanel } from './InputsPanel';

/** Animation / state-machine pickers and their inputs (play is beside the preview). */
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
}) {
  return (
    <Stack gap="5">
      <SegmentedControl
        label="Controller"
        fullWidth
        value={controller.active}
        onChange={(v) =>
          setControllerState(v as 'animations' | 'state-machines')
        }
        options={[
          { value: 'animations', label: 'Animations' },
          { value: 'state-machines', label: 'State machines' },
        ]}
      />

      {controller.active === 'animations' ? (
        <Stack gap="4">
          {artboards.length > 1 ? (
            <Select
              label="Artboard"
              value={selectedArtboard}
              onChange={setSelectedArtboard}
              options={artboards.map((a) => ({ value: a, label: a }))}
            />
          ) : null}
          {animationList && animationList.animations.length > 0 ? (
            <Select
              label="Animation"
              value={animationList.active}
              onChange={setActiveAnimation}
              options={animationList.animations.map((a) => ({
                value: a,
                label: a,
              }))}
            />
          ) : (
            <EmptyState
              size="sm"
              title="No animations"
              description="This artboard has no timeline animations."
            />
          )}
        </Stack>
      ) : (
        <Stack gap="4">
          {stateMachineList && stateMachineList.stateMachines.length > 0 ? (
            <Select
              label="State machine"
              value={stateMachineList.active}
              onChange={setActiveStateMachine}
              options={stateMachineList.stateMachines.map((s) => ({
                value: s,
                label: s,
              }))}
            />
          ) : (
            <EmptyState
              size="sm"
              title="No state machines"
              description="This artboard has no state machines."
            />
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
      )}
    </Stack>
  );
}
