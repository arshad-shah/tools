import type { MemoryRegister } from '../types';

/** Register `index` plus `delta` (an empty register counts as 0). */
export function adjustRegister(
  registers: MemoryRegister[],
  index: number,
  delta: number,
): MemoryRegister[] {
  const updated = [...registers];
  updated[index] = {
    ...updated[index],
    value: (updated[index].value ?? 0) + delta,
  };
  return updated;
}

/** Register `index` emptied. */
export function clearRegister(
  registers: MemoryRegister[],
  index: number,
): MemoryRegister[] {
  const updated = [...registers];
  updated[index] = { ...updated[index], value: null };
  return updated;
}

/** Every register emptied, labels kept. */
export function clearRegisters(registers: MemoryRegister[]): MemoryRegister[] {
  return registers.map((m) => ({ ...m, value: null }));
}
