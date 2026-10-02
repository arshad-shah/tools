/** True when every `(` has a matching `)` and none closes early. */
export function checkParenthesesBalance(expr: string): boolean {
  let balance = 0;
  for (const char of expr) {
    if (char === '(') balance++;
    if (char === ')') balance--;
    if (balance < 0) return false;
  }
  return balance === 0;
}
