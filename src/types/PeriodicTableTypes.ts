
// Type definitions
interface Element {
  symbol: string;
  name: string;
  number: number;
  group: string;
  period: number;
  column: number;
  electrons: string;
  mass: number;
  description: string;
}

interface ColorMap {
  [key: string]: string;
}


export type { Element, ColorMap };