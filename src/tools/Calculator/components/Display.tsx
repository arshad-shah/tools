
// -----------------------
// Display.tsx
// A simple display bar that shows the current operation and main display
// -----------------------
import { FC } from 'react';

interface DisplayProps {
  pendingOperator: string | null;
  calculationValue: number;
  previousCalculation: string;
  display: string;
  formatDisplay: (val: string) => string;
}

const Display: FC<DisplayProps> = ({
  pendingOperator,
  calculationValue,
  previousCalculation,
  display,
  formatDisplay,
}) => {
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-white shadow-inner">
      {/* Top line: either show `value op` or the last calculation */}
      <div className="text-right text-sm h-6 overflow-hidden text-gray-500">
        {pendingOperator ? `${calculationValue} ${pendingOperator}` : previousCalculation}
      </div>
      {/* Main line: current display */}
      <div className="text-right text-4xl font-bold break-all min-h-16 flex items-end justify-end overflow-x-auto">
        {formatDisplay(display)}
      </div>
    </div>
  );
};

export default Display;
