/** "1 match", "2 matches": the count with the right word. */
export const plural = (n: number, one: string, many = `${one}es`) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
