// -----------------------
// Calculator.tsx
// -----------------------
import React from 'react';
import { Calculator as CalcIcon, History, Star, RotateCcw, Clock } from 'lucide-react';

import { useCalculator } from './hooks/useCalculator'; // or inline your logic
import Display from './components/Display';
import MemoryPanel from './components/MemoryPanel';
import HistoryPanel from './components/HistoryPanel';
import FavoritesPanel from './components/FavouritesPanel';
import TabButton from './components/TabButton';

import StandardCalculator from './StandardCalculator/StandardCalculator';
import ScientificCalculator from './ScientificCalculator/ScientificCalculator';
import ExpressionCalculator from './ExpressionCalculator/ExpressionCalculator';

const Calculator: React.FC = () => {
  const calc = useCalculator();

  // Here we destructure all the states and actions we need
  const {
    mode,
    setMode,
    angleUnit,
    setAngleUnit,
    display,
    pendingOperator,
    calculationValue,
    previousCalculation,
    animation,
    formatDisplay,
    toggleHistory,
    toggleFavorites,
    showFavorites,
    toggleMemoryPanel,
    showMemoryPanel,
    toggleTimestamps,
    showTimestamp,
    calculationHistory,
    savedCalculations,
    memories,
    memoryClearAll,
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,

    // Keypad actions
    inputDigit,
    inputDecimal,
    clear,
    clearEntry,
    backspace,
    toggleSign,
    percentage,
    performOperation,
    calculate,

    // Scientific
    squareRoot,
    square,
    reciprocal,
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

    // Expression
    evaluateExpression,
    checkParenthesesBalance,
    saveCalculation,
    toggleGraph,
    showGraph,
    setDisplay,
  } = calc;

  const handleUseResultFromHistoryOrFav = (value: string) => {
    // e.g. user clicks "Use Result"
    // set that as the display
    setDisplay(value);
  };

  // Render UI
  return (
    <div className="max-w-md mx-auto mt-8 p-5 rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <CalcIcon size={20} className="text-gray-800" />
          <span className="ml-2 text-lg font-bold text-gray-800">
            ProCalc
            {mode === 'scientific' ? ' Pro' : mode === 'expression' ? ' Dev' : ''}
          </span>
          {/* Indicate if any memory register is non-null */}
          {memories.some((m) => m.value !== null) && (
            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-500 text-white">
              M
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleMemoryPanel}
            className="p-2 rounded-full text-gray-700 bg-gray-200 hover:bg-gray-300"
            title="Memory"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={toggleHistory}
            className="p-2 rounded-full text-gray-700 bg-gray-200 hover:bg-gray-300"
            title="History"
          >
            <History size={16} />
          </button>
          <button
            onClick={toggleFavorites}
            className="p-2 rounded-full text-gray-700 bg-gray-200 hover:bg-gray-300"
            title="Saved Calculations"
          >
            <Star size={16} className={showFavorites ? 'text-yellow-400' : ''} />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex space-x-2 mb-4">
        <TabButton active={mode === 'standard'} onClick={() => setMode('standard')}>
          Standard
        </TabButton>
        <TabButton active={mode === 'scientific'} onClick={() => setMode('scientific')}>
          Scientific
        </TabButton>
        <TabButton active={mode === 'expression'} onClick={() => setMode('expression')}>
          Expression
        </TabButton>
      </div>

      {/* (Optional) Some angle/timestamp toggles visible in scientific mode */}
      {mode === 'scientific' && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setAngleUnit(angleUnit === 'deg' ? 'rad' : 'deg')}
              className="text-xs px-2 py-1 rounded font-medium bg-gray-200 text-gray-800"
            >
              {angleUnit.toUpperCase()}
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleTimestamps}
              className="p-1 rounded bg-gray-200 text-gray-800"
              title={showTimestamp ? 'Hide Timestamps' : 'Show Timestamps'}
            >
              <Clock size={14} className={showTimestamp ? 'text-blue-500' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* Display (for standard/scientific). 
          In expression mode we might show a different layout, 
          but let's reuse Display for consistency of “previousCalculation”. 
      */}
      {mode !== 'expression' && (
        <Display
          pendingOperator={pendingOperator}
          calculationValue={calculationValue}
          previousCalculation={previousCalculation}
          display={display}
          formatDisplay={formatDisplay}
        />
      )}

      {/* Main Content */}
      {mode === 'standard' && (
        <StandardCalculator
          animation={animation}
          inputDigit={inputDigit}
          inputDecimal={inputDecimal}
          clear={clear}
          clearEntry={clearEntry}
          backspace={backspace}
          toggleSign={toggleSign}
          percentage={percentage}
          performOperation={performOperation}
          calculate={calculate}
          squareRoot={squareRoot}
          square={square}
          reciprocal={reciprocal}
        />
      )}

      {mode === 'scientific' && (
        <ScientificCalculator
          display={display}
          animation={animation}
          inputDigit={inputDigit}
          inputDecimal={inputDecimal}
          clear={clear}
          clearEntry={clearEntry}
          backspace={backspace}
          toggleSign={toggleSign}
          percentage={percentage}
          performOperation={performOperation}
          calculate={calculate}
          squareRoot={squareRoot}
          square={square}
          reciprocal={reciprocal}
          factorial={factorial}
          sin={sin}
          cos={cos}
          tan={tan}
          asin={asin}
          acos={acos}
          atan={atan}
          sinh={sinh}
          cosh={cosh}
          tanh={tanh}
        />
      )}

      {mode === 'expression' && (
        <ExpressionCalculator
          display={display}
          setDisplay={setDisplay}
          checkParenthesesBalance={checkParenthesesBalance}
          evaluateExpression={evaluateExpression}
          saveCalculation={saveCalculation}
          toggleGraph={toggleGraph}
          showGraph={showGraph}
          backspace={backspace}
          clear={clear}
        />
      )}

      {/* Side Panels */}
      {showMemoryPanel && (
        <MemoryPanel
          memories={memories}
          memoryClearAll={memoryClearAll}
          memoryRecall={memoryRecall}
          memoryAdd={memoryAdd}
          memorySubtract={memorySubtract}
          memoryClear={memoryClear}
        />
      )}

      <HistoryPanel
        calculationHistory={calculationHistory}
        showTimestamp={showTimestamp}
        setCalculationHistory={saveCalculation}
        onUseResult={handleUseResultFromHistoryOrFav}
      />

      {showFavorites && (
        <FavoritesPanel
          savedCalculations={savedCalculations}
          setSavedCalculations={saveCalculation}
          onUseResult={handleUseResultFromHistoryOrFav}
        />
      )}
    </div>
  );
};

export default Calculator;
