import { describe, expect, it } from 'vitest';
import { adjustRegister, clearRegister, clearRegisters } from './memory';

const regs = () => [
  { label: 'M1', value: null },
  { label: 'M2', value: 5 },
  { label: 'M3', value: null },
];

describe('memory registers', () => {
  it('adds to and subtracts from a register, empty counting as 0', () => {
    expect(adjustRegister(regs(), 0, 3)[0]).toEqual({ label: 'M1', value: 3 });
    expect(adjustRegister(regs(), 1, -2)[1]).toEqual({ label: 'M2', value: 3 });
  });

  it('never mutates the input', () => {
    const before = regs();
    const after = adjustRegister(before, 1, 1);
    expect(before[1].value).toBe(5);
    expect(after).not.toBe(before);
    expect(after[0]).toBe(before[0]);
  });

  it('clears one or all registers, keeping labels', () => {
    expect(clearRegister(regs(), 1)[1]).toEqual({ label: 'M2', value: null });
    expect(clearRegisters(regs())).toEqual([
      { label: 'M1', value: null },
      { label: 'M2', value: null },
      { label: 'M3', value: null },
    ]);
  });
});
