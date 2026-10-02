import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { isMac } from './platform';

/**
 * Hotkey strings and a global shortcut registry (spec §13.1).
 * Combos read like `Mod+Shift+Z`, `Alt+ArrowUp`, `?` or `p`; "Mod" is
 * Command on macOS and Control elsewhere.
 */
export type KeyName =
  | 'Mod'
  | 'Shift'
  | 'Alt'
  | 'Ctrl'
  | 'Enter'
  | 'Backspace'
  | 'Delete'
  | 'Tab'
  | 'Escape'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Space'
  | 'PageUp'
  | 'PageDown'
  | 'Home'
  | 'End'
  | (string & {});

export interface Hotkey {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  /** Lower-cased for single characters, otherwise the KeyboardEvent.key name. */
  key: string;
}

const MODIFIERS = new Set(['mod', 'shift', 'alt', 'ctrl']);

function splitCombo(combo: string): string[] {
  // A trailing '+' is the plus key itself ('+', 'Mod++').
  if (combo === '+') return ['+'];
  if (combo.endsWith('++'))
    return [...splitCombo(combo.slice(0, -2)), '+'].filter(Boolean);
  return combo.split('+').filter(Boolean);
}

const normaliseKey = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

export function parseHotkey(combo: string): Hotkey {
  const hk: Hotkey = {
    mod: false,
    shift: false,
    alt: false,
    ctrl: false,
    key: '',
  };
  for (const part of splitCombo(combo)) {
    const lower = part.toLowerCase();
    if (MODIFIERS.has(lower))
      hk[lower as 'mod' | 'shift' | 'alt' | 'ctrl'] = true;
    else hk.key = normaliseKey(part);
  }
  return hk;
}

type AnyKeyboardEvent = KeyboardEvent | ReactKeyboardEvent;

export function matchesHotkey(
  e: AnyKeyboardEvent,
  combo: string,
  mac: boolean = isMac(),
): boolean {
  const hk = parseHotkey(combo);
  const meta = mac && hk.mod;
  const ctrl = hk.ctrl || (!mac && hk.mod);
  if (e.metaKey !== meta || e.ctrlKey !== ctrl || e.altKey !== hk.alt)
    return false;

  const wanted = hk.key === 'Space' ? ' ' : hk.key;
  const pressed = normaliseKey(e.key);
  const isLetter = /^[a-z]$/.test(wanted);
  const isDigit = /^[0-9]$/.test(wanted);
  // Printable symbols ('?', '/', '+') imply their own shift state on every
  // layout, so shift is not compared for them.
  const printable = wanted.length === 1 && !isLetter && !isDigit;
  if (!printable && e.shiftKey !== hk.shift) return false;
  if (pressed === wanted) return true;
  // Option on macOS changes e.key (Option+P is a symbol) and Shift changes a
  // digit's key (Shift+7 is '&' on US layouts): fall back to the physical key.
  if (isLetter) return e.code === `Key${wanted.toUpperCase()}`;
  return isDigit && e.code === `Digit${wanted}`;
}

/**
 * Display order. macOS: Control, Option, Shift, Command. Elsewhere Mod is
 * Control, so it leads: Ctrl, Alt, Shift.
 */
export function hotkeyParts(combo: string, mac: boolean = isMac()): KeyName[] {
  const hk = parseHotkey(combo);
  const parts: KeyName[] = mac
    ? (['Ctrl', 'Alt', 'Shift', 'Mod'] as const).filter(
        (m) => hk[m.toLowerCase() as 'ctrl' | 'alt' | 'shift' | 'mod'],
      )
    : [
        ...(hk.mod ? ['Mod'] : hk.ctrl ? ['Ctrl'] : []),
        ...(hk.alt ? ['Alt'] : []),
        ...(hk.shift ? ['Shift'] : []),
      ];
  if (hk.key) {
    const original = splitCombo(combo).find(
      (p) => !MODIFIERS.has(p.toLowerCase()),
    );
    parts.push(original ?? hk.key);
  }
  return parts;
}

const WORDS_MAC: Record<string, string> = {
  Mod: 'Command',
  Alt: 'Option',
  Ctrl: 'Control',
};
const WORDS_OTHER: Record<string, string> = {
  Mod: 'Ctrl',
  Alt: 'Alt',
  Ctrl: 'Ctrl',
};
const KEY_WORDS: Record<string, string> = {
  ArrowUp: 'Up arrow',
  ArrowDown: 'Down arrow',
  ArrowLeft: 'Left arrow',
  ArrowRight: 'Right arrow',
  PageUp: 'Page up',
  PageDown: 'Page down',
  '?': 'Question mark',
  '+': 'Plus',
  '/': 'Slash',
};

/** Plain-words label: "Command Shift Z" on macOS, "Ctrl Shift Z" elsewhere. */
export function hotkeyLabel(combo: string, mac: boolean = isMac()): string {
  const words = mac ? WORDS_MAC : WORDS_OTHER;
  return hotkeyParts(combo, mac)
    .map(
      (p) => words[p] ?? KEY_WORDS[p] ?? (p.length === 1 ? p.toUpperCase() : p),
    )
    .join(' ');
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string')
    return false;
  const el = target as HTMLElement;
  if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true')
    return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type;
  return ![
    'checkbox',
    'radio',
    'button',
    'submit',
    'reset',
    'range',
    'color',
    'file',
  ].includes(type);
}

export interface ShortcutDef {
  id: string;
  combo: string;
  description: string;
  group: string;
  when?: () => boolean;
  /**
   * Fire while a text field has focus. Default false: fields keep their own
   * keys (native undo, select all, typing). Escape is always allowed. Keys
   * typed with AltGraph held never fire in a field.
   */
  allowInFields?: boolean;
  /**
   * Fire while a modal (an `aria-modal="true"` element) is open. Default
   * false: page and workspace shortcuts sleep behind a modal dialog; set it
   * for shortcuts the modal itself registers. Escape is always allowed.
   */
  allowInModal?: boolean;
  run: (e: KeyboardEvent) => void;
}

/** A modal is open: the event came from inside one, or one is in the page. */
function modalOpen(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false;
  const el = target as Element | null;
  if (
    el &&
    typeof el.closest === 'function' &&
    el.closest('[aria-modal="true"]')
  )
    return true;
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** One registration; its defs can be replaced in place (stable priority). */
interface Registration {
  defs: ShortcutDef[];
}

const stack: Registration[] = [];
let listening = false;

function onKeyDown(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  // An IME is composing: the key belongs to the composition.
  if (e.isComposing || e.key === 'Process') return;
  const typing = isTypingTarget(e.target);
  // AltGr types characters ("@" on German layouts) and Windows reports it as
  // Ctrl+Alt: in a field it is text, never a Ctrl+Alt shortcut.
  const altGraph = e.getModifierState?.('AltGraph') ?? false;
  const modal = modalOpen(e.target);
  for (let r = stack.length - 1; r >= 0; r--) {
    const defs = stack[r].defs;
    for (let i = defs.length - 1; i >= 0; i--) {
      const def = defs[i];
      if (!matchesHotkey(e, def.combo)) continue;
      const escape = parseHotkey(def.combo).key === 'Escape';
      if (typing && (!def.allowInFields || altGraph) && !escape) continue;
      if (modal && !def.allowInModal && !escape) continue;
      if (def.when && !def.when()) continue;
      e.preventDefault();
      def.run(e);
      return;
    }
  }
}

function addRegistration(reg: Registration): () => void {
  stack.push(reg);
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    listening = true;
  }
  return () => {
    const i = stack.lastIndexOf(reg);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0 && listening) {
      window.removeEventListener('keydown', onKeyDown);
      listening = false;
    }
  };
}

/** Adds shortcuts to the global registry; the latest registration wins. */
export function registerShortcuts(defs: ShortcutDef[]): () => void {
  return addRegistration({ defs });
}

/** Every registered shortcut, oldest first (for the shortcut sheet). */
export function listShortcuts(): ShortcutDef[] {
  return stack.flatMap((r) => r.defs);
}

/**
 * Registers shortcuts while the component is mounted. The registration
 * keeps its place in the stack: a deps change replaces its definitions in
 * place instead of moving it to the top.
 */
export function useShortcuts(defs: ShortcutDef[], deps: unknown[]): void {
  const reg = useRef<Registration | null>(null);
  useEffect(() => {
    const r: Registration = { defs: [] };
    reg.current = r;
    const dispose = addRegistration(r);
    return () => {
      dispose();
      reg.current = null;
    };
  }, []);
  useEffect(() => {
    if (reg.current) reg.current.defs = defs;
    // The caller owns the dependency list (like useMemo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
