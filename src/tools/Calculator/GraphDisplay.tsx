import { FC, useState } from 'react';
import * as math from 'mathjs';
import Plot from 'react-plotly.js';
import { Box, Inline, Label, NumberInput, Stack, Text } from '@/components/ui';
import { cn } from '@/lib/utils';

interface GraphDisplayProps {
  /**
   * The expression to evaluate, e.g. "x^2 + 2*x - 5".
   * Use 'x' as the variable.
   */
  expression: string;
  /**
   * The default minimum x-value (domain start).
   */
  defaultMinX?: number;
  /**
   * The default maximum x-value (domain end).
   */
  defaultMaxX?: number;
  /**
   * The default step used to sample points
   * (lower step => smoother curve, but more points => heavier compute).
   */
  defaultStep?: number;
  /**
   * Optional className for the container.
   */
  className?: string;
}

/**
 * A React component for plotting a mathematical expression
 * using react-plotly.js for performance and convenience.
 */
const PlotlyGraphDisplay: FC<GraphDisplayProps> = ({
  expression,
  defaultMinX = -10,
  defaultMaxX = 10,
  defaultStep = 1,
  className,
}) => {
  const [minX, setMinX] = useState<number>(defaultMinX);
  const [maxX, setMaxX] = useState<number>(defaultMaxX);
  const [step, setStep] = useState<number>(defaultStep);

  // Generate data points
  const generateData = () => {
    if (maxX <= minX || step <= 0) return { xVals: [], yVals: [] };

    const xVals: number[] = [];
    const yVals: number[] = [];

    // Sample the expression from minX to maxX in increments of 'step'
    for (let x = minX; x <= maxX + 1e-14; x += step) {
      let yVal = NaN;
      try {
        // Replace 'x' in the expression with the numeric x
        const replacedExpr = expression.replace(/x/g, `(${x})`);
        const result = math.evaluate(replacedExpr);
        if (typeof result === 'number') {
          yVal = result;
        }
      } catch {
        // If there's any error (domain, syntax), yVal remains NaN
      }
      xVals.push(x);
      yVals.push(yVal);
    }
    return { xVals, yVals };
  };

  const { xVals, yVals } = generateData();

  return (
    <Box className={cn('mx-auto max-w-md', className)}>
      <Stack gap="4">
        {/* Controls for domain & step */}
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
          <Stack gap="2" className="flex-1">
            <Label htmlFor="graph-step">Step</Label>
            <NumberInput
              id="graph-step"
              value={step}
              min={0.1}
              step={0.1}
              onValueChange={(val) => setStep(val > 0 ? val : 0.1)}
              aria-label="Sampling step"
            />
          </Stack>
        </Inline>

        {/* Expression & Basic Info */}
        <Stack gap="1">
          <Text size="sm">
            <Text as="span" weight="semibold">
              Expression:
            </Text>{' '}
            {expression}
          </Text>
          <Text size="sm">
            <Text as="span" weight="semibold">
              Points:
            </Text>{' '}
            {xVals.length}
          </Text>
        </Stack>

        {/* Plotly React Component */}
        <Plot
          style={{ width: '100%', height: '400px' }}
          config={{ responsive: true }}
          data={[
            {
              x: xVals,
              y: yVals,
              type: 'scatter',
              mode: 'lines',
              line: { shape: 'spline', smoothing: 1.3 }, // smooth curve
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
      </Stack>
    </Box>
  );
};

export default PlotlyGraphDisplay;
