import React from 'react';
import {
  StateMachineInput,
  StateMachineInputType,
} from '@/shared/ui/adapters/rive-runtime';
import {
  Badge,
  Button,
  EmptyState,
  Grid,
  Heading,
  Inline,
  Label,
  Slider,
  Stack,
  SwitchField,
} from '@/shared/ui';
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
          <Grid max={2} gap="2">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Trigger)
              .map((input) => (
                <Button
                  key={input.name}
                  variant="secondary"
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
                <SwitchField
                  key={input.name}
                  label={input.name}
                  checked={booleanValues[input.name] ?? false}
                  onCheckedChange={(v) => {
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
                <Stack key={input.name} gap="2">
                  <Inline justify="between" align="center">
                    <Label>{input.name}</Label>
                    <Badge variant="soft" tone="neutral" size="sm">
                      {numberValues[input.name] ?? 0}
                    </Badge>
                  </Inline>
                  <Slider
                    value={numberValues[input.name] ?? 0}
                    onValueChange={(v) => handleInputChange(input, v)}
                    min={0}
                    max={100}
                    aria-label={input.name}
                  />
                </Stack>
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
