import { useState, type RefObject } from 'react';
import {
  Rive,
  StateMachineInput,
  StateMachineInputType,
} from '@rive-app/react-canvas';
import { notify } from '@/shared/lib/notify';
import type { DebugLog } from '../types';

/** State-machine input values shown in the UI, and writing them to Rive. */
export function useInputValues(
  riveRef: RefObject<Rive | null>,
  addDebugLog: (message: string, type?: DebugLog['type']) => void,
) {
  const [numberValues, setNumberValues] = useState<Record<string, number>>({});
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>(
    {},
  );

  const handleInputChange = (
    input: StateMachineInput,
    value: boolean | number,
  ) => {
    if (!riveRef.current) return;
    try {
      addDebugLog(
        `Setting input ${input.name} (${input.type}) to ${value}`,
        'info',
      );
      switch (input.type) {
        case StateMachineInputType.Boolean:
          input.value = value as boolean;
          addDebugLog(`Set boolean input ${input.name} to ${value}`, 'success');
          break;
        case StateMachineInputType.Number:
          input.value = value as number;
          setNumberValues((prev) => ({
            ...prev,
            [input.name]: value as number,
          }));
          addDebugLog(`Set number input ${input.name} to ${value}`, 'success');
          break;
        case StateMachineInputType.Trigger:
          input.fire();
          addDebugLog(`Fired trigger input ${input.name}`, 'success');
          break;
        default:
          addDebugLog(`Unsupported input type: ${input.type}`, 'warning');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addDebugLog(`Error setting input ${input.name}: ${msg}`, 'error');
      notify.error(`Failed to update input: ${msg}`);
    }
  };

  /** Forget the values shown for the previous file or state machine. */
  const resetInputValues = () => {
    setNumberValues({});
    setBooleanValues({});
  };

  return {
    numberValues,
    booleanValues,
    setBooleanValues,
    handleInputChange,
    resetInputValues,
  };
}
