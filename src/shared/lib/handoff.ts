import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { getTool } from '@/app/registry';
import { toolPath } from '@/app/routes';
import { ToolError } from './errors';
import { newId } from './id';

/**
 * What one tool hands to another (spec §4.3, phase-5 §5.3): files from a hub
 * drop, or text with a mime from a "Send to" menu. In memory only, never
 * persisted or logged; each id can be taken once.
 */
export type HandoffPayload =
  | { kind: 'files'; files: File[]; sourceTool?: string }
  | {
      kind: 'text';
      /** e.g. 'application/json', 'text/csv', 'application/jwt' */
      mime: string;
      text: string;
      /** Tool id. */
      sourceTool: string;
      filename?: string;
      /** e.g. `{ side: 'left' }` for Text Diff. */
      meta?: Record<string, string | number | boolean>;
    };

export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_TTL_MS = 300_000;
export const HANDOFF_MAX = 8;
export const HANDOFF_TEXT_MAX = 50 * 1024 * 1024;

interface Entry {
  payload: HandoffPayload;
  expires: number;
}

/** Insertion-ordered, so the first key is the oldest entry. */
const pending = new Map<string, Entry>();

function prune(now: number): void {
  for (const [id, e] of pending) if (e.expires <= now) pending.delete(id);
}

/**
 * Stores a payload and returns its one-time id. A bare `File[]` is a files
 * payload (the hub drop). Text over 50 MB is refused with TOO_LARGE; past
 * eight entries the oldest is dropped.
 */
export function putHandoff(payload: HandoffPayload | File[]): string {
  const p: HandoffPayload = Array.isArray(payload)
    ? { kind: 'files', files: payload }
    : payload;
  if (p.kind === 'text' && p.text.length > HANDOFF_TEXT_MAX)
    throw new ToolError(
      'TOO_LARGE',
      'This text is too large to send to another tool (over 50 MB)',
    );
  const now = Date.now();
  prune(now);
  while (pending.size >= HANDOFF_MAX)
    pending.delete(pending.keys().next().value as string);
  const id = newId();
  pending.set(id, { payload: p, expires: now + HANDOFF_TTL_MS });
  return id;
}

function peekHandoff(id: string): HandoffPayload | null {
  prune(Date.now());
  return pending.get(id)?.payload ?? null;
}

/** The payload for `id`, removed on read; null when unknown, expired or taken. */
export function takeHandoff(id: string): HandoffPayload | null {
  const payload = peekHandoff(id);
  pending.delete(id);
  return payload;
}

/** Puts `payload` and navigates to the tool's route with its id. */
export function sendTo(
  navigate: (to: string) => void,
  toolId: string,
  payload: HandoffPayload,
): void {
  const tool = getTool(toolId);
  if (!tool) throw new Error(`sendTo: unknown tool "${toolId}"`);
  navigate(`${toolPath(tool)}?${HANDOFF_PARAM}=${putHandoff(payload)}`);
}

function stripParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(HANDOFF_PARAM);
  window.history.replaceState(
    window.history.state,
    '',
    url.pathname + url.search + url.hash,
  );
}

/**
 * Reads `?handoff=<id>` once per mount. A payload `match` accepts is taken
 * and the param removed with replaceState (no navigation); one it rejects is
 * left for another reader on the page (Text Diff's two panels). An unknown
 * or expired id is just removed: the tool shows its normal empty state.
 */
function useHandoffReader(
  match: (p: HandoffPayload) => boolean,
  onRead: (p: HandoffPayload) => void,
): void {
  const latest = useRef({ match, onRead });
  useEffect(() => {
    latest.current = { match, onRead };
  });
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get(HANDOFF_PARAM);
    if (id === null) return;
    const payload = peekHandoff(id);
    if (payload && !latest.current.match(payload)) return;
    stripParam();
    if (payload) latest.current.onRead(takeHandoff(id) ?? payload);
  }, []);
}

const isFiles = (p: HandoffPayload) => p.kind === 'files';

/** The handed-off files as state (null until and unless there are some). */
export function useHandoff(): File[] | null;
/** The handed-off payload `match` accepts, as state. */
export function useHandoff(
  match: (p: HandoffPayload) => boolean,
): HandoffPayload | null;
export function useHandoff(
  match?: (p: HandoffPayload) => boolean,
): HandoffPayload | File[] | null {
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  useHandoffReader(match ?? isFiles, setPayload);
  if (match) return payload;
  return payload?.kind === 'files' && payload.files.length
    ? payload.files
    : null;
}

/**
 * Calls `onFiles` once with the handed-off files. Delivery waits for the
 * render after the read, so StrictMode's mount-unmount-mount check (which
 * cancels jobs started on the first mount) is over by then.
 */
export function useHandoffFiles(onFiles: (files: File[]) => void): void {
  const files = useHandoff();
  const deliver = useEffectEvent(onFiles);
  const delivered = useRef<File[] | null>(null);
  useEffect(() => {
    if (!files || delivered.current === files) return;
    delivered.current = files;
    deliver(files);
  }, [files]);
}
