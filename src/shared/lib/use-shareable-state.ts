import { useEffect, useMemo, useRef, useState } from 'react';
import { copyText } from './clipboard';
import { ToolError } from './errors';
import { notify } from './notify';
import { decodeShare, encodeShare, SHARE_FRAGMENT_MAX } from './share-state';

export interface ShareableStateOptions<S> {
  toolId: string;
  /** The tool's share-state version; links from a newer one are refused. */
  version: number;
  /**
   * Hand-written validator: the shared state (from a link of `version` or
   * older) as `S`, or null when it does not fit.
   */
  parse: (state: unknown, version: number) => S | null;
  /** The state to share now (only allow-listed fields, spec §4.2). */
  select: () => S;
}

export interface ShareableState<S> {
  /** Builds the link, copies it and resolves to it. */
  share(): Promise<string>;
  canShare: boolean;
  /** Why sharing is off, for the disabled button's tooltip. */
  reason?: string;
  /** State from the link this page was opened with, once; else null. */
  loaded: S | null;
}

type Hydration<S> = { loaded: S | null; error: ToolError | null } | null;

function readLink<S>(
  version: number,
  parse: ShareableStateOptions<S>['parse'],
): Hydration<S> {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith('s=')) return null;
  try {
    const decoded = decodeShare(hash);
    if (decoded.version > version)
      throw new ToolError(
        'INVALID_INPUT',
        'This share link is damaged or from a newer version',
      );
    const loaded = parse(decoded.state, decoded.version);
    if (loaded === null)
      throw new ToolError(
        'INVALID_INPUT',
        'This share link does not fit this tool',
      );
    return { loaded, error: null };
  } catch (e) {
    return {
      loaded: null,
      error:
        e instanceof ToolError
          ? e
          : new ToolError('INVALID_INPUT', 'This share link is damaged', {
              cause: e,
            }),
    };
  }
}

/**
 * Share a tool's state as a link (spec §4.2). Only tools on the allow-list
 * may call this (test/share-allowlist.test.ts). The tool hydrates once from
 * `loaded`; the fragment is then removed and later edits never touch the URL.
 */
export function useShareableState<S>({
  version,
  parse,
  select,
}: ShareableStateOptions<S>): ShareableState<S> {
  // Read once per mount (decoding is pure, so StrictMode's double call of the
  // initializer is harmless).
  const [hydration] = useState(() => readLink(version, parse));
  const cleaned = useRef(false);
  useEffect(() => {
    if (!hydration || cleaned.current) return;
    cleaned.current = true;
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', pathname + search);
    if (hydration.error) notify.error(hydration.error);
  }, [hydration]);

  // Encode only when the shared state changes. Stringifying large inputs
  // (Text Diff) on every keystroke-free render is wasted work, so a state
  // whose top-level values are unchanged reuses the last JSON.
  const selected = select();
  const [memo, setMemo] = useState(() => ({
    state: selected,
    json: JSON.stringify(selected) ?? 'null',
  }));
  let current = memo;
  if (!shallowEqual(memo.state, selected)) {
    current = { state: selected, json: JSON.stringify(selected) ?? 'null' };
    setMemo(current);
  }
  const json = current.json;
  const encoded = useMemo(
    () => encodeShare(JSON.parse(json) as unknown, version),
    [json, version],
  );

  const share = async () => {
    if (!encoded.ok) throw new ToolError('TOO_LARGE', tooLarge(encoded.size));
    const { origin, pathname, search } = window.location;
    const url = `${origin}${pathname}${search}#${encoded.fragment}`;
    try {
      await copyText(url);
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not copy to clipboard');
      throw e;
    }
    notify.success('Share link copied');
    return url;
  };

  return {
    share,
    canShare: encoded.ok,
    reason: encoded.ok ? undefined : tooLarge(encoded.size),
    loaded: hydration?.loaded ?? null,
  };
}

// The fragment limit is in characters, so the message counts characters
// (a KB figure under the 6,000-character cap looked deceptively small).
const tooLarge = (size: number) =>
  `Too large to share as a link (${size.toLocaleString('en')} of ${SHARE_FRAGMENT_MAX.toLocaleString('en')} characters)`;

/** Same keys with identical values (one level deep). */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) =>
      Object.is(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    )
  );
}
