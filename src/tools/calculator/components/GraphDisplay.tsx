import { FC, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Box,
  Inline,
  Label,
  NumberInput,
  Stack,
  Text,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toToolError } from '@/shared/lib/errors';
import { Chart, type ChartFunction } from '@/shared/ui/chart';
import { compileFunction } from '../lib/evaluate';
import type { AngleUnit } from '../types';

interface GraphDisplayProps {
  /** The expression to plot, e.g. "x^2 + 2*x - 5", with x as the variable. */
  expression: string;
  /** Trig functions follow the same DEG/RAD switch as Evaluate. */
  angleUnit: AngleUnit;
  defaultMinX?: number;
  defaultMaxX?: number;
  className?: string;
}

/**
 * Plots `expression` over [minX, maxX]. The expression is compiled once
 * (no text substitution of x, so exp or max keep working) and the kit chart
 * samples it adaptively; undefined points and poles leave gaps.
 */
export const GraphDisplay: FC<GraphDisplayProps> = ({
  expression,
  angleUnit,
  defaultMinX = -10,
  defaultMaxX = 10,
  className,
}) => {
  const [minX, setMinX] = useState<number>(defaultMinX);
  const [maxX, setMaxX] = useState<number>(defaultMaxX);

  const compiled = useMemo(() => {
    try {
      return { fn: compileFunction(expression, angleUnit) };
    } catch (e) {
      return { error: toToolError(e).message };
    }
  }, [expression, angleUnit]);

  const fns = useMemo<ChartFunction[]>(
    () =>
      compiled.fn
        ? [{ id: 'f', label: `f(x) = ${expression}`, fn: compiled.fn }]
        : [],
    [compiled, expression],
  );

  return (
    <Box className={cn('mx-auto max-w-md', className)}>
      <Stack gap="4">
        <Inline gap="3" wrap align="end">
          <Stack gap="2" className="flex-1">
            <Label htmlFor="graph-min-x">Min X</Label>
            <NumberInput
              id="graph-min-x"
              value={minX}
              step={0.1}
              onValueChange={setMinX}
              aria-label="Minimum X value"
            />
          </Stack>
          <Stack gap="2" className="flex-1">
            <Label htmlFor="graph-max-x">Max X</Label>
            <NumberInput
              id="graph-max-x"
              value={maxX}
              step={0.1}
              onValueChange={setMaxX}
              aria-label="Maximum X value"
            />
          </Stack>
        </Inline>

        <Text size="sm">
          <Text as="span" weight="semibold">
            Expression:
          </Text>{' '}
          {expression} ({angleUnit === 'deg' ? 'degrees' : 'radians'})
        </Text>

        {compiled.error ? (
          <Alert status="danger">
            <AlertDescription>Cannot plot: {compiled.error}</AlertDescription>
          </Alert>
        ) : (
          <Chart
            kind="function"
            fns={fns}
            xDomain={maxX > minX ? [minX, maxX] : [maxX, minX]}
            height={400}
            xLabel="x"
            yLabel="f(x)"
            zoomable
            ariaLabel={`Graph of f(x) = ${expression}`}
            ariaSummary={`f(x) = ${expression} for x from ${Math.min(minX, maxX)} to ${Math.max(minX, maxX)}`}
          />
        )}
      </Stack>
    </Box>
  );
};
