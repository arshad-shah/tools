import React from 'react';
import { IconTrash2 } from '@/shared/ui/icons';

import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { CalculatorState } from '../hooks/useCalculator';
import { resultOf } from '../lib/display';

type HistoryPanelProps = Pick<
  CalculatorState,
  'calculationHistory' | 'setCalculationHistory' | 'showTimestamp'
> & { onUseResult: (value: string) => void };

/** Every finished calculation, newest last, or an empty state. */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  calculationHistory,
  setCalculationHistory,
  showTimestamp,
  onUseResult,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center">
        <CardTitle as="h3">History</CardTitle>
        {calculationHistory.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setCalculationHistory([])}
          >
            Clear
          </Button>
        )}
      </Inline>
    </CardHeader>
    <CardBody>
      {calculationHistory.length === 0 ? (
        <Text size="sm" tone="subtle" className="text-center">
          No calculations yet
        </Text>
      ) : (
        <Box className="overflow-auto max-h-96">
          <Stack gap="2">
            {calculationHistory.map((item, idx) => {
              const text = typeof item === 'string' ? item : item.calculation;
              const timestamp =
                typeof item === 'string' ? undefined : item.timestamp;
              return (
                <Card key={idx}>
                  <CardBody>
                    <Stack gap="1">
                      <Text size="sm">{text}</Text>
                      {showTimestamp && timestamp && (
                        <Text size="xs" tone="subtle">
                          {timestamp}
                        </Text>
                      )}
                      <Inline>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => {
                            const result = resultOf(text);
                            if (result !== null) onUseResult(result);
                          }}
                        >
                          Use result
                        </Button>
                      </Inline>
                    </Stack>
                  </CardBody>
                </Card>
              );
            })}
          </Stack>
        </Box>
      )}
    </CardBody>
  </Card>
);

type FavoritesPanelProps = Pick<
  CalculatorState,
  'savedCalculations' | 'setSavedCalculations'
> & { onUseResult: (value: string) => void };

/** Calculations the user starred. */
export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  savedCalculations,
  setSavedCalculations,
  onUseResult,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center">
        <CardTitle as="h3">Saved calculations</CardTitle>
        {savedCalculations.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setSavedCalculations([])}
          >
            Clear all
          </Button>
        )}
      </Inline>
    </CardHeader>
    <CardBody>
      {savedCalculations.length === 0 ? (
        <Text size="sm" tone="subtle" className="text-center">
          No saved calculations yet
        </Text>
      ) : (
        <Box className="overflow-auto max-h-96">
          <Stack gap="2">
            {savedCalculations.map((item, idx) => (
              <Card key={idx}>
                <CardBody>
                  <Stack gap="1">
                    <Inline justify="between" align="start" gap="2">
                      <Stack gap="1">
                        <Text size="sm">{item.calculation}</Text>
                        {item.timestamp && (
                          <Text size="xs" tone="subtle">
                            {item.timestamp}
                          </Text>
                        )}
                      </Stack>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        label="Remove"
                        icon={<IconTrash2 size="sm" />}
                        onClick={() => {
                          const next = [...savedCalculations];
                          next.splice(idx, 1);
                          setSavedCalculations(next);
                        }}
                      />
                    </Inline>
                    <Inline>
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => {
                          const result = resultOf(item.calculation);
                          if (result !== null) onUseResult(result);
                        }}
                      >
                        Use result
                      </Button>
                    </Inline>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
    </CardBody>
  </Card>
);
