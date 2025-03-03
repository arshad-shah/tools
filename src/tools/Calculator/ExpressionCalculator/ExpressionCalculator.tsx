// -----------------------
// ExpressionCalculator.tsx
// -----------------------
import { FC, ChangeEvent } from 'react';
import CalculatorKey from '../components/CalculatorKey';
import { ArrowLeft, Equal, BarChart4, Star } from 'lucide-react';
import PlotlyGraphDisplay from '../GraphDisplay';

interface ExpressionCalculatorProps {
  display: string;
  setDisplay: (val: string) => void;
  checkParenthesesBalance: (expr: string) => boolean;
  evaluateExpression: () => void;
  saveCalculation: () => void;
  toggleGraph: () => void;
  showGraph: boolean;
  backspace: () => void;
  clear: () => void;
}

/** 
 * Optionally, a GraphDisplay component can be used if you have one:
 * import GraphDisplay from './GraphDisplay';
 * 
 * This example just shows toggling `showGraph`—replace with your own graph logic
 */

const ExpressionCalculator: FC<ExpressionCalculatorProps> = ({
  display,
  setDisplay,
  checkParenthesesBalance,
  evaluateExpression,
  saveCalculation,
  toggleGraph,
  showGraph,
  backspace,
  clear,
}) => {
  const isBalanced = checkParenthesesBalance(display);

  return (
    <div>
      <div className="p-2 rounded-lg mb-2 text-sm bg-gray-100 text-gray-700">
        Use expressions like <code>2+3*4</code>, <code>sin(30)</code>, or <code>x^2 + 1</code>.
        <div>
          Parentheses balanced?{' '}
          <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
            {isBalanced ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="flex space-x-2 mb-2">
        <button
          onClick={evaluateExpression}
          className="flex-1 py-2 rounded-lg text-center bg-blue-600 hover:bg-blue-700 text-white"
        >
          Evaluate
        </button>
        <button
          onClick={saveCalculation}
          className="py-2 px-3 rounded-lg bg-gray-200 text-gray-800"
          title="Save Calculation"
        >
          <Star size={16} />
        </button>
        <button
          onClick={toggleGraph}
          className="p-2 rounded-lg bg-gray-200 text-gray-800"
          title="Plot Expression"
        >
          <BarChart4 size={16} />
        </button>
      </div>

      {showGraph && <div className="mb-4"><PlotlyGraphDisplay expression={display} /></div>}

      <div className="grid grid-cols-1 gap-2">
        <textarea
          className="w-full h-32 p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          value={display}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDisplay(e.target.value)}
          placeholder="Enter mathematical expression (use 'x' for plotting)..."
        />

        {/* Quick insertion row 1 */}
        <div className="grid grid-cols-4 gap-2">
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + '(')}
          >
            (
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + ')')}
          >
            )
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + '^')}
          >
            ^
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={clear}
          >
            C
          </CalculatorKey>

          {/* Quick insertion row 2 */}
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'sin(')}
          >
            sin
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'cos(')}
          >
            cos
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'tan(')}
          >
            tan
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={backspace}
            icon={<ArrowLeft size={16} />}
          />

          {/* Quick insertion row 3 */}
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'sqrt(')}
          >
            sqrt
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'log(')}
          >
            log
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'ln(')}
          >
            ln
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + '!')}
          >
            !
          </CalculatorKey>

          {/* Quick insertion row 4 */}
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'x')}
          >
            x
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'pi')}
          >
            π
          </CalculatorKey>
          <CalculatorKey
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setDisplay(display + 'e')}
          >
            e
          </CalculatorKey>
          <CalculatorKey
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={evaluateExpression}
            icon={<Equal size={16} />}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpressionCalculator;
