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
import { Chart } from '@/shared/ui/adapters/Chart';
import { compileFunction, sampleFunction } from '../lib/evaluate';
import type { AngleUnit } from '../types';

const SAMPLES = 400;

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
 * (no text substitution of x, so exp or max keep working) and sampled at
 * 400 even points; undefined points leave gaps.
 */
export const PlotlyGraphDisplay: FC<GraphDisplayProps> = ({
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

  const { xs, ys } = useMemo(
    () =>
      compiled.fn && maxX > minX
        ? sampleFunction(compiled.fn, minX, maxX, SAMPLES)
        : { xs: [], ys: [] },
    [compiled, minX, maxX],
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
            label={`Graph of f(x) = ${expression}`}
            className="h-[400px] w-full"
            data={[
              {
                x: xs,
                y: ys,
                type: 'scatter',
                mode: 'lines',
                connectgaps: false,
              },
            ]}
            layout={{
              autosize: true,
              title: { text: `f(x) = ${expression}` },
              xaxis: { title: { text: 'x' } },
              yaxis: { title: { text: 'f(x)' } },
              margin: { l: 60, r: 20, t: 40, b: 40 },
            }}
          />
        )}
      </Stack>
    </Box>
  );
};
