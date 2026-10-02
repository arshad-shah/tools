import React from 'react';
import {
  StateMachineInput,
  StateMachineInputType,
} from '@rive-app/react-canvas';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Grid,
  Heading,
  Inline,
  Label,
  Slider,
  Stack,
  Switch,
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
          <Heading level={4} size="sm">
            Triggers
          </Heading>
          <Grid max={2} gap="2">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Trigger)
              .map((input) => (
                <Button
                  key={input.name}
                  variant="solid"
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
          <Heading level={4} size="sm">
            Booleans
          </Heading>
          <Stack gap="2">
            {stateMachineInputs
              .filter((i) => i.type === StateMachineInputType.Boolean)
              .map((input) => (
                <Inline key={input.name} align="center" gap="2">
                  <Switch
                    id={input.name}
                    checked={booleanValues[input.name] ?? false}
                    onCheckedChange={(v) => {
                      setBooleanValues((prev) => ({
                        ...prev,
                        [input.name]: v,
                      }));
                      handleInputChange(input, v);
                    }}
                    aria-label={input.name}
                  />
                  <Label htmlFor={input.name}>{input.name}</Label>
                </Inline>
              ))}
          </Stack>
        </Stack>
      )}

      {stateMachineInputs.some(
        (i) => i.type === StateMachineInputType.Number,
      ) && (
        <Stack gap="2">
          <Heading level={4} size="sm">
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
        <Alert status="info">
          <AlertDescription>
            No inputs available for this state machine.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
