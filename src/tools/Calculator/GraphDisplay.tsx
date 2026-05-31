import { FC, useState } from 'react';
import * as math from 'mathjs';
import Plot from 'react-plotly.js';

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
   * Optional style or className for the container.
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
  className = '',
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
    <div className={`max-w-md mx-auto ${className}`}>
      {/* Controls for domain & step */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min X
          </label>
          <input
            type="number"
            step="0.1"
            value={minX}
            onChange={(e) => setMinX(parseFloat(e.target.value))}
            className="w-24 px-2 py-1 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max X
          </label>
          <input
            type="number"
            step="0.1"
            value={maxX}
            onChange={(e) => setMaxX(parseFloat(e.target.value))}
            className="w-24 px-2 py-1 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step
          </label>
          <input
            type="number"
            step="0.1"
            value={step}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setStep(val > 0 ? val : 0.1); // ensure step > 0
            }}
            className="w-24 px-2 py-1 border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Expression & Basic Info */}
      <div className="mb-2 text-sm">
        <p>
          <span className="font-semibold">Expression:</span> {expression}
        </p>
        <p>
          <span className="font-semibold">Points:</span> {xVals.length}
        </p>
      </div>

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
    </div>
  );
};

export default PlotlyGraphDisplay;
