// -----------------------
// StandardCalculator.tsx
// -----------------------
import  { FC } from "react";
import CalculatorKey from "../components/CalculatorKey";
import {
  Divide,
  X,
  Minus,
  Plus,
  Equal,
  Percent,
  ArrowLeft,
} from "lucide-react";

interface StandardCalculatorProps {
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
}

const StandardCalculator: FC<StandardCalculatorProps> = ({
  animation,
  inputDigit,
  inputDecimal,
  clear,
  clearEntry,
  backspace,
  toggleSign,
  percentage,
  performOperation,
  calculate,
  squareRoot,
  square,
  reciprocal,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Row 1 */}
      <CalculatorKey
        className={`bg-red-500 hover:bg-red-600 text-white ${animation}`}
        onClick={clear}
      >
        C
      </CalculatorKey>
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={clearEntry}
      >
        CE
      </CalculatorKey>
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={backspace}
        icon={<ArrowLeft size={16} />}
      />
      <CalculatorKey
        className={`bg-indigo-500 hover:bg-indigo-600 text-white ${animation}`}
        onClick={() => performOperation("÷")}
        icon={<Divide size={16} />}
      />

      {/* Row 2 */}
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(7)}
      >
        7
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(8)}
      >
        8
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(9)}
      >
        9
      </CalculatorKey>
      <CalculatorKey
        className={`bg-indigo-500 hover:bg-indigo-600 text-white ${animation}`}
        onClick={() => performOperation("×")}
        icon={<X size={16} />}
      />

      {/* Row 3 */}
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(4)}
      >
        4
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(5)}
      >
        5
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(6)}
      >
        6
      </CalculatorKey>
      <CalculatorKey
        className={`bg-indigo-500 hover:bg-indigo-600 text-white ${animation}`}
        onClick={() => performOperation("-")}
        icon={<Minus size={16} />}
      />

      {/* Row 4 */}
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(1)}
      >
        1
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(2)}
      >
        2
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(3)}
      >
        3
      </CalculatorKey>
      <CalculatorKey
        className={`bg-indigo-500 hover:bg-indigo-600 text-white ${animation}`}
        onClick={() => performOperation("+")}
        icon={<Plus size={16} />}
      />

      {/* Row 5 */}
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={toggleSign}
      >
        ±
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={() => inputDigit(0)}
      >
        0
      </CalculatorKey>
      <CalculatorKey
        className={`bg-white hover:bg-gray-100 text-gray-800 ${animation}`}
        onClick={inputDecimal}
      >
        .
      </CalculatorKey>
      <CalculatorKey
        className={`bg-blue-600 hover:bg-blue-700 text-white ${animation}`}
        onClick={calculate}
        icon={<Equal size={16} />}
      />

      {/* Row 6 */}
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={percentage}
        icon={<Percent size={16} />}
      />
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={squareRoot}
      >
        √
      </CalculatorKey>
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={square}
      >
        x²
      </CalculatorKey>
      <CalculatorKey
        className={`bg-gray-200 hover:bg-gray-300 text-gray-700 ${animation}`}
        onClick={reciprocal}
      >
        1/x
      </CalculatorKey>
    </div>
  );
};

export default StandardCalculator;
