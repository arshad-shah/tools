// -----------------------
// types.ts
// -----------------------
export type Mode = "standard" | "scientific" | "expression";
export type AngleUnit = "deg" | "rad";
export type PendingOperator = string | null;

export interface CalculationWithTimestamp {
  calculation: string;
  timestamp?: string;
}

export type CalculationHistoryItem = string | CalculationWithTimestamp;

export interface SavedCalculation {
  calculation: string;
  timestamp?: string;
  isFavorite: boolean;
}

export interface MemoryRegister {
  label: string;
  value: number | null;
}
