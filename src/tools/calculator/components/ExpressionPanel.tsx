import React, { useMemo } from 'react';
import {
  IconArrowLeft,
  IconBarChart4,
  IconEqual,
  IconStar,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Grid,
  IconButton,
  Inline,
  Stack,
  Textarea,
} from '@/shared/ui';
import type { CalculatorState } from '../hooks/useCalculator';
import { checkParenthesesBalance } from '../lib/expression';
import { CalcKey } from './CalcKey';
import { GraphDisplay } from './GraphDisplay';

type ExpressionPanelProps = Pick<
  CalculatorState,
  | 'display'
  | 'setDisplay'
  | 'angleUnit'
  | 'evaluateExpression'
  | 'saveCalculation'
  | 'showGraph'
  | 'toggleGraph'
  | 'clear'
  | 'backspace'
>;

export const ExpressionPanel: React.FC<ExpressionPanelProps> = ({
  display,
  setDisplay,
  angleUnit,
  evaluateExpression,
  saveCalculation,
  showGraph,
  toggleGraph,
  clear,
  backspace,
}) => {
  const isBalanced = useMemo(() => checkParenthesesBalance(display), [display]);

  return (
    <Stack gap="3">
      <Alert status="info">
        <AlertDescription>
          Use expressions like 2+3*4, sin(30), or x^2+1. Trig functions use the
          DEG or RAD setting above. Parentheses balanced:{' '}
          <Badge
            variant="soft"
            tone={isBalanced ? 'success' : 'danger'}
            size="xs"
          >
            {isBalanced ? 'Yes' : 'No'}
          </Badge>
        </AlertDescription>
      </Alert>

      <Inline gap="2" wrap>
        <Box className="flex-1">
          <Button
            variant="primary"
            onClick={evaluateExpression}
            leftIcon={<IconEqual size="sm" />}
            fullWidth
          >
            Evaluate
          </Button>
        </Box>
        <IconButton
          variant="secondary"
          label="Save calculation"
          icon={<IconStar size="sm" />}
          onClick={saveCalculation}
        />
        <IconButton
          variant={showGraph ? 'primary' : 'secondary'}
          label="Plot expression"
          icon={<IconBarChart4 size="sm" />}
          onClick={toggleGraph}
        />
      </Inline>

      {showGraph && (
        <Card>
          <CardBody>
            <GraphDisplay expression={display} angleUnit={angleUnit} />
          </CardBody>
        </Card>
      )}

      <Textarea
        value={display}
        onChange={setDisplay}
        rows={4}
        placeholder="Enter mathematical expression (use 'x' for plotting)…"
        aria-label="Expression"
      />

      <Grid cols={4} gap="2">
        <CalcKey onClick={() => setDisplay(display + '(')}>(</CalcKey>
        <CalcKey onClick={() => setDisplay(display + ')')}>)</CalcKey>
        <CalcKey onClick={() => setDisplay(display + '^')}>^</CalcKey>
        <CalcKey variant="primary" colorScheme="danger" onClick={clear}>
          C
        </CalcKey>

        <CalcKey onClick={() => setDisplay(display + 'sin(')}>sin</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'cos(')}>cos</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'tan(')}>tan</CalcKey>
        <CalcKey
          onClick={backspace}
          icon={<IconArrowLeft size="sm" />}
          label="Backspace"
        />

        <CalcKey onClick={() => setDisplay(display + 'sqrt(')}>sqrt</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'log(')}>log</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'ln(')}>ln</CalcKey>
        <CalcKey onClick={() => setDisplay(display + '!')}>!</CalcKey>

        <CalcKey onClick={() => setDisplay(display + 'x')}>x</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'pi')}>π</CalcKey>
        <CalcKey onClick={() => setDisplay(display + 'e')}>e</CalcKey>
        <CalcKey
          variant="primary"
          colorScheme="success"
          onClick={evaluateExpression}
          icon={<IconEqual size="sm" />}
          label="Equals"
        />
      </Grid>
    </Stack>
  );
};
