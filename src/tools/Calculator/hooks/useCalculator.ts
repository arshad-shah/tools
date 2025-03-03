// -----------------------
// useCalculator.ts
// Example custom hook to keep all the logic in one place
// Reusable across Standard, Scientific, or Expression modes
// -----------------------
import { useState, useEffect, useCallback } from "react";
import * as math from "mathjs";
import {
  Mode,
  AngleUnit,
  PendingOperator,
  CalculationHistoryItem,
  SavedCalculation,
  MemoryRegister,
} from "../../../types/CalculatorTypes";

export function useCalculator() {
  // Core State
  const [display, setDisplay] = useState<string>("0");
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [pendingOperator, setPendingOperator] = useState<PendingOperator>(null);
  const [previousCalculation, setPreviousCalculation] = useState<string>("");
  const [calculationValue, setCalculationValue] = useState<number>(0);

  // UI States
  const [mode, setMode] = useState<Mode>("standard");
  const [angleUnit, setAngleUnit] = useState<AngleUnit>("deg");
  const [animation, setAnimation] = useState<string>("");

  // History & Favorites
  const [calculationHistory, setCalculationHistory] = useState<
    CalculationHistoryItem[]
  >([]);
  const [savedCalculations, setSavedCalculations] = useState<
    SavedCalculation[]
  >([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const [showTimestamp, setShowTimestamp] = useState<boolean>(false);

  // Multiple Memory Registers
  const [memories, setMemories] = useState<MemoryRegister[]>([
    { label: "M1", value: null },
    { label: "M2", value: null },
    { label: "M3", value: null },
  ]);
  const [showMemoryPanel, setShowMemoryPanel] = useState<boolean>(false);

  // Graphing (only used in Expression mode)
  const [showGraph, setShowGraph] = useState<boolean>(false);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      // Add your logic for mapping keys -> actions
      // For brevity, only a few examples:
      if (key >= "0" && key <= "9") {
        event.preventDefault();
        inputDigit(Number(key));
      }
      if (key === "Escape") {
        event.preventDefault();
        clear();
      }
      // ...and so on.
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [display, waitingForOperand, calculationValue, pendingOperator]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Local storage sync
  useEffect(() => {
    const storedHistory = localStorage.getItem("calcHistory");
    if (storedHistory) setCalculationHistory(JSON.parse(storedHistory));

    const storedFavorites = localStorage.getItem("savedCalculations");
    if (storedFavorites) setSavedCalculations(JSON.parse(storedFavorites));

    const storedMemories = localStorage.getItem("memories");
    if (storedMemories) setMemories(JSON.parse(storedMemories));
  }, []);

  useEffect(() => {
    localStorage.setItem("calcHistory", JSON.stringify(calculationHistory));
  }, [calculationHistory]);

  useEffect(() => {
    localStorage.setItem(
      "savedCalculations",
      JSON.stringify(savedCalculations)
    );
  }, [savedCalculations]);

  useEffect(() => {
    localStorage.setItem("memories", JSON.stringify(memories));
  }, [memories]);

  // Helpers
  const animateButton = () => {
    setAnimation("animate-pulse");
    setTimeout(() => setAnimation(""), 100);
  };

  const setDisplayError = (msg: string) => {
    setDisplay(`Error: ${msg}`);
  };

  const formatDisplay = (value: string): string => {
    if (value.startsWith("Error")) return value; // pass error message as-is

    const floatVal = parseFloat(value);
    if (!isNaN(floatVal)) {
      // If there's a decimal, keep it
      if (value.includes(".")) {
        const [intPart, decimalPart] = value.split(".");
        const parsedInt = parseInt(intPart, 10);
        if (!isNaN(parsedInt)) {
          return `${parsedInt.toLocaleString()}.${decimalPart}`;
        }
        return value;
      }
      // Otherwise, format integer
      return floatVal.toLocaleString();
    }
    // If not parseable as number, return raw
    return value;
  };

  // Core actions
  const inputDigit = (digit: number) => {
    animateButton();
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    animateButton();
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    animateButton();
    setDisplay("0");
    setWaitingForOperand(false);
    setPendingOperator(null);
    setCalculationValue(0);
    setPreviousCalculation("");
  };

  const clearEntry = () => {
    animateButton();
    setDisplay("0");
    setWaitingForOperand(false);
  };

  const backspace = () => {
    animateButton();
    if (waitingForOperand) return;
    setDisplay(display.length === 1 ? "0" : display.slice(0, -1));
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
      setDisplayError("Invalid number");
      return;
    }

    if (calculationValue === 0 && !pendingOperator) {
      setCalculationValue(operand);
    } else if (pendingOperator) {
      const currentValue = calculationValue;
      let newValue: number;

      switch (pendingOperator) {
        case "+":
          newValue = currentValue + operand;
          break;
        case "-":
          newValue = currentValue - operand;
          break;
        case "×":
          newValue = currentValue * operand;
          break;
        case "÷":
          if (operand === 0) {
            setDisplayError("Divide by zero");
            return;
          }
          newValue = currentValue / operand;
          break;
        case "pow":
          newValue = Math.pow(currentValue, operand);
          break;
        case "mod":
          if (operand === 0) {
            setDisplayError("Mod by zero");
            return;
          }
          newValue = currentValue % operand;
          break;
        default:
          newValue = operand;
      }

      if (Math.abs(newValue) < 1e-10) newValue = 0;

      setCalculationValue(newValue);
      setDisplay(String(newValue));

      const displayOp =
        pendingOperator === "pow"
          ? "^"
          : pendingOperator === "mod"
          ? "mod"
          : pendingOperator;

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
  const square = () => {
    animateButton();
    const value = parseFloat(display);
    if (isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const result = value * value;
    setDisplay(String(result));
    const expr = `sqr(${value}) = ${result}`;
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const squareRoot = () => {
    animateButton();
    const value = parseFloat(display);
    if (isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    if (value < 0) {
      setDisplayError("Square root of negative");
      return;
    }
    const result = Math.sqrt(value);
    setDisplay(String(result));
    const expr = `√(${value}) = ${result}`;
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const reciprocal = () => {
    animateButton();
    const value = parseFloat(display);
    if (isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    if (value === 0) {
      setDisplayError("Divide by zero");
      return;
    }
    const result = 1 / value;
    setDisplay(String(result));
    const expr = `1/(${value}) = ${result}`;
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const factorial = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value) || !Number.isInteger(value) || value < 0) {
      setDisplayError("Factorial domain error");
      return;
    }
    let result = 1;
    for (let i = 2; i <= value; i++) {
      result *= i;
    }
    setDisplay(String(result));
    const expr = `${value}! = ${result}`;
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  // Trig
  const sin = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const radians = angleUnit === "deg" ? (value * Math.PI) / 180 : value;
    const result = Math.sin(radians);
    const expr = `sin(${value}${angleUnit}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const cos = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const radians = angleUnit === "deg" ? (value * Math.PI) / 180 : value;
    const result = Math.cos(radians);
    const expr = `cos(${value}${angleUnit}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const tan = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const radians = angleUnit === "deg" ? (value * Math.PI) / 180 : value;
    const result = Math.tan(radians);
    const expr = `tan(${value}${angleUnit}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const asin = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value) || value < -1 || value > 1) {
      setDisplayError("arcsin domain error");
      return;
    }
    const asined = Math.asin(value);
    const result = angleUnit === "deg" ? (asined * 180) / Math.PI : asined;
    const expr = `asin(${value}) = ${result} ${angleUnit}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const acos = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value) || value < -1 || value > 1) {
      setDisplayError("arccos domain error");
      return;
    }
    const acosed = Math.acos(value);
    const result = angleUnit === "deg" ? (acosed * 180) / Math.PI : acosed;
    const expr = `acos(${value}) = ${result} ${angleUnit}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const atan = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const ataned = Math.atan(value);
    const result = angleUnit === "deg" ? (ataned * 180) / Math.PI : ataned;
    const expr = `atan(${value}) = ${result} ${angleUnit}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const sinh = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const result = math.sinh(value);
    const expr = `sinh(${value}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const cosh = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const result = math.cosh(value);
    const expr = `cosh(${value}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  const tanh = () => {
    animateButton();
    const value = parseFloat(display);
    if (Number.isNaN(value)) {
      setDisplayError("Invalid number");
      return;
    }
    const result = math.tanh(value);
    const expr = `tanh(${value}) = ${result}`;
    setDisplay(String(result));
    setPreviousCalculation(expr);
    setCalculationHistory([...calculationHistory, expr]);
    setWaitingForOperand(true);
  };

  // Expression mode
  const checkParenthesesBalance = (expr: string): boolean => {
    let balance = 0;
    for (const char of expr) {
      if (char === "(") balance++;
      if (char === ")") balance--;
      if (balance < 0) return false;
    }
    return balance === 0;
  };

  const evaluateExpression = () => {
    animateButton();
    try {
      const result = math.evaluate(display);
      if (typeof result === "number") {
        setDisplay(String(result));
        const expr = `${display} = ${result}`;
        setPreviousCalculation(expr);
        setCalculationHistory([...calculationHistory, expr]);
        setWaitingForOperand(true);
      } else {
        setDisplayError("Expression yielded non-scalar");
      }
    } catch {
      setDisplayError("Bad expression");
    }
  };

  // Saving calculations
  const saveCalculation = () => {
    if (previousCalculation) {
      const calcToSave = showTimestamp
        ? {
            calculation: previousCalculation,
            timestamp: new Date().toLocaleTimeString(),
            isFavorite: true,
          }
        : {
            calculation: previousCalculation,
            isFavorite: true,
          };
      setSavedCalculations([...savedCalculations, calcToSave]);
    }
  };

  // Panels toggles
  const toggleHistory = () => {
    setShowHistory(!showHistory);
    setShowFavorites(false);
    setShowMemoryPanel(false);
  };

  const toggleFavorites = () => {
    setShowFavorites(!showFavorites);
    setShowHistory(false);
    setShowMemoryPanel(false);
  };

  const toggleMemoryPanel = () => {
    setShowMemoryPanel(!showMemoryPanel);
    setShowHistory(false);
    setShowFavorites(false);
  };

  const toggleTimestamps = () => {
    setShowTimestamp(!showTimestamp);
  };

  const toggleGraph = () => {
    setShowGraph(!showGraph);
  };

  // Memory
  const memoryClearAll = () => {
    const cleared = memories.map((m) => ({ ...m, value: null }));
    setMemories(cleared);
  };

  const memoryAdd = (index: number) => {
    const operand = parseFloat(display);
    if (!Number.isNaN(operand)) {
      setMemories((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          value: (updated[index].value ?? 0) + operand,
        };
        return updated;
      });
    }
  };

  const memorySubtract = (index: number) => {
    const operand = parseFloat(display);
    if (!Number.isNaN(operand)) {
      setMemories((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          value: (updated[index].value ?? 0) - operand,
        };
        return updated;
      });
    }
  };

  const memoryRecall = (index: number) => {
    if (memories[index].value !== null) {
      setDisplay(String(memories[index].value));
      setWaitingForOperand(false);
    }
  };

  const memoryClear = (index: number) => {
    setMemories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: null };
      return updated;
    });
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
    showHistory,
    showFavorites,
    showTimestamp,
    memories,
    showMemoryPanel,
    showGraph,

    // Setters & toggles
    setMode,
    setAngleUnit,
    setDisplay,
    setShowGraph,
    checkParenthesesBalance,

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
    square,
    squareRoot,
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
    saveCalculation,

    // Panels
    toggleHistory,
    toggleFavorites,
    toggleMemoryPanel,
    toggleTimestamps,
    toggleGraph,

    // Memory
    memoryClearAll,
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,

    // Helpers
    formatDisplay,
  };
}
