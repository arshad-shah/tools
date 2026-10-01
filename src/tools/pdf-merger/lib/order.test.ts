import { describe, expect, it } from 'vitest';
import { insertByOrder } from './order';

const item = (name: string, order: number) => ({ name, order });
const names = (l: { name: string }[]) => l.map((i) => i.name);

describe('insertByOrder', () => {
  it('appends files from a new drop', () => {
    expect(
      names(insertByOrder([item('a', 0), item('b', 1)], [item('c', 2)])),
    ).toEqual(['a', 'b', 'c']);
  });

  it('puts a file unlocked later back where it was dropped', () => {
    // Dropped A(10) locked, B(11), C(12) locked: B arrives first.
    let list = insertByOrder([item('x', 1)], [item('B', 11)]);
    list = insertByOrder(list, [item('C', 12)]);
    list = insertByOrder(list, [item('A', 10)]);
    expect(names(list)).toEqual(['x', 'A', 'B', 'C']);
  });

  it("respects the user's own reordering of earlier files", () => {
    expect(
      names(insertByOrder([item('b', 1), item('a', 0)], [item('c', 2)])),
    ).toEqual(['b', 'a', 'c']);
  });
});
