// -----------------------
// ScientificCalculator.tsx
// (Wraps StandardCalculator, plus extra scientific keys)
// -----------------------
import { FC } from 'react';
import CalculatorKey from '../components/CalculatorKey';
import StandardCalculator from '../StandardCalculator/StandardCalculator';
import { Power } from 'lucide-react';

interface ScientificCalculatorProps {
  // All the same props from StandardCalculator, plus the scientific ones:
  display: string;
  animation: string;
  inputDigit: (n: number) => void;
  inputDecimal: () => void;
  clear: () => void;
  clearEntry: () => void;
  backspace: () => void;
  toggleSign: () => void;
  percentage: () => void;
  performOperation: (op: string | null) => void;
  calculate: () => void;
  squareRoot: () => void;
  square: () => void;
  reciprocal: () => void;
  factorial: () => void;
  sin: () => void;
  cos: () => void;
  tan: () => void;
  asin: () => void;
  acos: () => void;
  atan: () => void;
  sinh: () => void;
  cosh: () => void;
  tanh: () => void;
}

const ScientificCalculator: FC<ScientificCalculatorProps> = (props) => {
  const {
    factorial,
    sin,
    cos,
    tan,
    asin,
    acos,
    atan,
    sinh,
    cosh,
    tanh,
    performOperation,
    animation,
  } = props;

  return (
    <>
      {/* Additional scientific keys */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={factorial}>
          x!
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={() => performOperation('pow')} icon={<Power size={16} />}>
          xʸ
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={sin}>
          sin
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={cos}>
          cos
        </CalculatorKey>

        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={tan}>
          tan
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={asin}>
          asin
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={acos}>
          acos
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={atan}>
          atan
        </CalculatorKey>

        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={sinh}>
          sinh
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={cosh}>
          cosh
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={tanh}>
          tanh
        </CalculatorKey>
        <CalculatorKey className={`bg-indigo-200 hover:bg-indigo-300 text-indigo-800 ${animation}`} onClick={() => performOperation('mod')}>
          mod
        </CalculatorKey>
      </div>

      {/* Re-use the standard keypad for digits/operators */}
      <StandardCalculator {...props} />
    </>
  );
};

export default ScientificCalculator;
