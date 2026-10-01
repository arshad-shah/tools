export type CalcKeyAction =
  | { type: 'digit'; digit: number }
  | { type: 'decimal' }
  | { type: 'operator'; op: '+' | '-' | '×' | '÷' | 'pow' }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'clear-entry' }
  | { type: 'clear' }
  | { type: 'percent' };

interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

const describeTarget = (t: EventTarget | null) => {
  const el = t as { tagName?: unknown; isContentEditable?: unknown } | null;
  return {
    tag: typeof el?.tagName === 'string' ? el.tagName.toUpperCase() : '',
    editable: el?.isContentEditable === true,
  };
};

/**
 * The calculator's page-level key map. Keys typed into a text field (the
 * expression box keeps native caret editing), keys with Ctrl, Cmd or Alt
 * (browser shortcuts) and Enter or Space on a focused button are left alone.
 */
export function keyToAction(e: KeyLike): CalcKeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const { tag, editable } = describeTarget(e.target);
  if (editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
    return null;
  if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return null;
  const k = e.key;
  if (k.length === 1 && k >= '0' && k <= '9')
    return { type: 'digit', digit: Number(k) };
  switch (k) {
    case '.':
    case ',':
      return { type: 'decimal' };
    case '+':
      return { type: 'operator', op: '+' };
    case '-':
      return { type: 'operator', op: '-' };
    case '*':
      return { type: 'operator', op: '×' };
    case '/':
      return { type: 'operator', op: '÷' };
    case '^':
      return { type: 'operator', op: 'pow' };
    case '%':
      return { type: 'percent' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Backspace':
      return { type: 'backspace' };
    case 'Delete':
      return { type: 'clear-entry' };
    case 'Escape':
      return { type: 'clear' };
    default:
      return null;
  }
}
