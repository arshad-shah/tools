import React from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { CalculatorState } from '../hooks/useCalculator';

type MemoryPanelProps = Pick<
  CalculatorState,
  | 'memories'
  | 'memoryClearAll'
  | 'memoryRecall'
  | 'memoryAdd'
  | 'memorySubtract'
  | 'memoryClear'
>;

/** The M1-M3 registers. */
export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  memories,
  memoryClearAll,
  memoryRecall,
  memoryAdd,
  memorySubtract,
  memoryClear,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center">
        <CardTitle as="h3">Memory registers</CardTitle>
        <Button variant="danger" size="sm" onClick={memoryClearAll}>
          Clear all
        </Button>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="2">
        {memories.map((mem, i) => (
          <Card key={mem.label}>
            <CardBody>
              <Inline justify="between" align="center" gap="2" wrap>
                <Text size="sm" weight="medium">
                  {mem.label}: {mem.value === null ? '—' : String(mem.value)}
                </Text>
                <ButtonGroup>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => memoryRecall(i)}
                  >
                    MR
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => memoryAdd(i)}
                  >
                    M+
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => memorySubtract(i)}
                  >
                    M-
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => memoryClear(i)}
                  >
                    MC
                  </Button>
                </ButtonGroup>
              </Inline>
            </CardBody>
          </Card>
        ))}
      </Stack>
    </CardBody>
  </Card>
);
