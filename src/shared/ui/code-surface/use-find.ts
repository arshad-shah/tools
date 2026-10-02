import { useMemo, useState } from 'react';
import { findMatches, type FindResult } from './text-model';

export interface FindState {
  open: boolean;
  query: string;
  regex: boolean;
  result: FindResult;
  /** Index of the active match, or -1. */
  active: number;
  /** "3 of 17", "No matches", "Invalid pattern" or ''. */
  status: string;
  /** Bumped on every navigation (open, query, next, previous). */
  nav: number;
  show(initialQuery: string | undefined, caret: number): void;
  close(): void;
  setQuery(q: string, caret: number): void;
  setRegex(on: boolean, caret: number): void;
  next(): void;
  previous(): void;
}

const EMPTY: FindResult = { matches: [], capped: false };

/**
 * Find state for a text. The active match is derived: the first match at or
 * after the caret when the query was last changed, plus the steps taken
 * with next and previous (wrapping).
 */
export function useFind(text: string, enabled: boolean): FindState {
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState('');
  const [regex, setRegexState] = useState(false);
  const [anchor, setAnchor] = useState(0);
  const [step, setStep] = useState(0);
  const [nav, setNav] = useState(0);
  const bump = () => setNav((v) => v + 1);

  const result = useMemo(
    () => (open && enabled ? findMatches(text, query, regex) : EMPTY),
    [open, enabled, text, query, regex],
  );
  const n = result.matches.length;
  let active = -1;
  if (n) {
    let first = result.matches.findIndex((m) => m.start >= anchor);
    if (first < 0) first = 0;
    active = (((first + step) % n) + n) % n;
  }
  let status = '';
  if (result.error) status = result.error;
  else if (query && !n) status = 'No matches';
  else if (n)
    status = `${active + 1} of ${n}${result.capped ? ' or more' : ''}`;

  const reset = (caret: number) => {
    setAnchor(caret);
    setStep(0);
    bump();
  };
  return {
    open,
    query,
    regex,
    result,
    active,
    status,
    nav,
    show(initial, caret) {
      setOpen(true);
      if (initial !== undefined) setQueryState(initial);
      reset(caret);
    },
    close: () => setOpen(false),
    setQuery(q, caret) {
      setQueryState(q);
      reset(caret);
    },
    setRegex(on, caret) {
      setRegexState(on);
      reset(caret);
    },
    next() {
      setStep((s) => s + 1);
      bump();
    },
    previous() {
      setStep((s) => s - 1);
      bump();
    },
  };
}
