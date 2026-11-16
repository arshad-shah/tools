import React from 'react';
import {
  StateMachineInput,
  StateMachineInputType,
} from '@/shared/ui/adapters/rive-runtime';
import {
  Button,
  EmptyState,
  Grid,
  Heading,
  Slider,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { zap } from '@arshad-shah/cynosure/icons';
import type { RiveStateMachines } from '../types';

/** Trigger, boolean and number inputs of the active state machine. */
export function InputsPanel({
  stateMachineInputs,
  stateMachineList,
  booleanValues,
  setBooleanValues,
  numberValues,
  handleInputChange,
}: {
  stateMachineInputs: StateMachineInput[];
  stateMachineList: RiveStateMachines | null;
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
    <>
      {stateMachineInputs.some(
        (i) => i.type === StateMachineInputType.Trigger,
      ) && (
        <Stack gap="2">
          <Heading level={3} size="sm">
            Triggers
          </Heading>
          <Grid columns={{ base: 1, sm: 2 }} gap="2">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Trigger)
              .map((input) => (
                <Button
                  key={input.name}
                  variant="soft"
                  icon={zap}
                  size="sm"
                  onClick={() => handleInputChange(input, true)}
                  fullWidth
                >
                  {input.name}
                </Button>
              ))}
          </Grid>
        </Stack>
      )}

      {stateMachineInputs.some(
        (i) => i.type === StateMachineInputType.Boolean,
      ) && (
        <Stack gap="2">
          <Heading level={3} size="sm">
            Booleans
          </Heading>
          <Stack gap="2">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Boolean)
              .map((input) => (
                <Switch
                  key={input.name}
                  label={input.name}
                  checked={booleanValues[input.name] ?? false}
                  onChange={(v) => {
                    setBooleanValues((prev) => ({
                      ...prev,
                      [input.name]: v,
                    }));
                    handleInputChange(input, v);
                  }}
                />
              ))}
          </Stack>
        </Stack>
      )}

      {stateMachineInputs.some(
        (i) => i.type === StateMachineInputType.Number,
      ) && (
        <Stack gap="2">
          <Heading level={3} size="sm">
            Numbers
          </Heading>
          <Stack gap="3">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Number)
              .map((input) => (
                <Slider
                  key={input.name}
                  label={input.name}
                  showValue
                  value={numberValues[input.name] ?? 0}
                  onChange={(v) => handleInputChange(input, v as number)}
                  min={0}
                  max={100}
                />
              ))}
          </Stack>
        </Stack>
      )}

      {stateMachineInputs.length === 0 && stateMachineList && (
        <EmptyState
          size="sm"
          title="No inputs"
          description="This state machine has no inputs to change."
        />
      )}
    </>
  );
}
