
// Define TypeScript interfaces
interface Unit {
  name: string;
  symbol: string;
  factor: number;
  offset?: number;
}

interface Category {
  name: string;
  icon: React.ReactNode;
  baseUnit: string;
  units: Unit[];
}

interface Conversion {
  id: number;
  category: string;
  categoryIcon: React.ReactNode;
  from: string;
  to: string;
  fromUnit: Unit;
  toUnit: Unit;
  fromValue: string;
  timestamp: Date;
}

export type { Unit, Category, Conversion };