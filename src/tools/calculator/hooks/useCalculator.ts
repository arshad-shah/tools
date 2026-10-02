import { useState } from 'react';
import { Mode, AngleUnit, PendingOperator } from '../types';
import { useCalculatorStore } from '../store';
import { evaluateExpression as evaluateLib } from '../lib/evaluate';
import { applyOperator, operatorSymbol } from '../lib/display';
import { applyUnary, type UnaryOp } from '../lib/scientific';
import { adjustRegister, clearRegister, clearRegisters } from '../lib/memory';
import { useCalculatorKeyboard } from './useCalculatorKeyboard';
import { useCalculatorPanels } from './useCalculatorPanels';
import { toToolError } from '@/shared/lib/errors';

/**
 * The calculator state machine, shared by Standard, Scientific and
 * Expression modes. The arithmetic lives in ../lib.
 */
export function useCalculator() {
  // Core State
  const [display, setDisplay] = useState<string>('0');
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [pendingOperator, setPendingOperator] = useState<PendingOperator>(null);
  const [previousCalculation, setPreviousCalculation] = useState<string>('');
  const [calculationValue, setCalculationValue] = useState<number>(0);

  // UI States
  const [mode, setMode] = useState<Mode>('standard');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('deg');
  const [animation, setAnimation] = useState<string>('');

  // History & Favorites
  // Persisted through store-kit (see ../store).
  const calculationHistory = useCalculatorStore((s) => s.history);
  const setCalculationHistory = useCalculatorStore.getState().setHistory;
  const savedCalculations = useCalculatorStore((s) => s.saved);
  const setSavedCalculations = useCalculatorStore.getState().setSaved;

  // Multiple Memory Registers
  const memories = useCalculatorStore((s) => s.memories);
  const setMemories = useCalculatorStore.getState().setMemories;
  // The History card starts open when there is saved history to show.
  const panels = useCalculatorPanels(calculationHistory.length > 0);
  const { showTimestamp } = panels;

  // Helpers
  const animateButton = () => {
    setAnimation('animate-pulse');
    setTimeout(() => setAnimation(''), 100);
  };

  const setDisplayError = (msg: string) => {
    setDisplay(`Error: ${msg}`);
  };

  /** Show a result, remember its history line and wait for a new operand. */
  const showResult = (text: string, expr: string) => {
    setDisplay(text);
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  // Core actions
  const inputDigit = (digit: number) => {
    animateButton();
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    animateButton();
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    animateButton();
    setDisplay('0');
    setWaitingForOperand(false);
    setPendingOperator(null);
    setCalculationValue(0);
    setPreviousCalculation('');
  };

  const clearEntry = () => {
    animateButton();
    setDisplay('0');
    setWaitingForOperand(false);
  };

  const backspace = () => {
    animateButton();
    if (waitingForOperand) return;
    setDisplay(display.length === 1 ? '0' : display.slice(0, -1));
  };

  const toggleSign = () => {
    animateButton();
    const value = parseFloat(display);
    if (!isNaN(value)) {
      setDisplay(String(-value));
    }
  };

  const percentage = () => {
    animateButton();
    const value = parseFloat(display);
    if (!isNaN(value)) {
      setDisplay(String(value / 100));
    }
  };

  // Basic operations
  const performOperation = (operator: PendingOperator) => {
    animateButton();
    const operand = parseFloat(display);

    if (Number.isNaN(operand)) {
      setDisplayError('Invalid number');
      return;
    }

    if (calculationValue === 0 && !pendingOperator) {
      setCalculationValue(operand);
    } else if (pendingOperator) {
      const currentValue = calculationValue;
      const result = applyOperator(currentValue, operand, pendingOperator);
      if ('error' in result) {
        setDisplayError(result.error);
        return;
      }
      const newValue = result.value;

      setCalculationValue(newValue);
      setDisplay(String(newValue));

      const displayOp = operatorSymbol(pendingOperator);
      const calculation = `${currentValue} ${displayOp} ${operand} = ${newValue}`;
      setPreviousCalculation(calculation);
    }
    setWaitingForOperand(true);
    setPendingOperator(operator);
  };

  const calculate = () => {
    animateButton();
    performOperation(null);
    if (previousCalculation) {
      const historyItem = showTimestamp
        ? {
            calculation: previousCalculation,
            timestamp: new Date().toLocaleTimeString(),
          }
        : previousCalculation;

      setCalculationHistory([...calculationHistory, historyItem]);
    }
  };

  // Scientific operations
  const unary = (op: UnaryOp) => () => {
    animateButton();
    const result = applyUnary(op, parseFloat(display), angleUnit);
    if ('error' in result) {
      setDisplayError(result.error);
      return;
    }
    showResult(String(result.value), result.expr);
  };

  // Expression mode
  const evaluateExpression = () => {
    animateButton();
    try {
      const { text } = evaluateLib(display, angleUnit);
      showResult(text, `${display} = ${text}`);
    } catch (e) {
      setDisplayError(toToolError(e, 'Bad expression').message);
    }
  };

  useCalculatorKeyboard(mode, {
    inputDigit,
    inputDecimal,
    performOperation,
    calculate,
    backspace,
    clearEntry,
    clear,
    percentage,
  });

  // Saving calculations
  const saveCalculation = () => {
    if (previousCalculation) {
      const calcToSave = {
        calculation: previousCalculation,
        ...(showTimestamp && { timestamp: new Date().toLocaleTimeString() }),
        isFavorite: true,
      };
      setSavedCalculations([...savedCalculations, calcToSave]);
    }
  };

  // Memory
  const memoryClearAll = () => setMemories(clearRegisters(memories));

  /** Adds (sign 1) or subtracts (sign -1) the displayed number. */
  const memoryAdjust = (index: number, sign: 1 | -1) => {
    const operand = parseFloat(display);
    if (!Number.isNaN(operand)) {
      setMemories((prev) => adjustRegister(prev, index, sign * operand));
    }
  };

  const memoryRecall = (index: number) => {
    if (memories[index].value !== null) {
      setDisplay(String(memories[index].value));
      setWaitingForOperand(false);
    }
  };

  const memoryClear = (index: number) => {
    setMemories((prev) => clearRegister(prev, index));
  };

  return {
    // State
    display,
    waitingForOperand,
    pendingOperator,
    previousCalculation,
    calculationValue,
    mode,
    angleUnit,
    animation,
    calculationHistory,
    savedCalculations,
    memories,

    // Setters & toggles
    setMode,
    setAngleUnit,
    setDisplay,

    // Actions
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
    square: unary('square'),
    squareRoot: unary('squareRoot'),
    reciprocal: unary('reciprocal'),
    factorial: unary('factorial'),
    sin: unary('sin'),
    cos: unary('cos'),
    tan: unary('tan'),
    asin: unary('asin'),
    acos: unary('acos'),
    atan: unary('atan'),
    sinh: unary('sinh'),
    cosh: unary('cosh'),
    tanh: unary('tanh'),

    // Expression
    evaluateExpression,
    saveCalculation,
    setCalculationHistory,
    setSavedCalculations,

    // Panels
    ...panels,

    // Memory
    memoryClearAll,
    memoryAdd: (index: number) => memoryAdjust(index, 1),
    memorySubtract: (index: number) => memoryAdjust(index, -1),
    memoryRecall,
    memoryClear,
  };
}

export type CalculatorState = ReturnType<typeof useCalculator>;
