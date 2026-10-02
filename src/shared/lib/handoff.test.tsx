/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, useEffect } from 'react';
import { render, renderHook } from '@testing-library/react';
import {
  HANDOFF_MAX,
  putHandoff,
  sendTo,
  takeHandoff,
  useHandoff,
  useHandoffFiles,
  type HandoffPayload,
} from './handoff';

const f = (name: string) => new File(['x'], name);

function Probe({ onFiles }: { onFiles: (files: File[]) => void }) {
  useHandoffFiles(onFiles);
  return null;
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.useRealTimers();
});

describe('handoff', () => {
  it('hands files over once', () => {
    const files = [f('a.csv')];
    const id = putHandoff(files);
    expect(takeHandoff(id)).toEqual({ kind: 'files', files });
    expect(takeHandoff(id)).toBeNull();
  });
  it('returns null for an unknown id', () => {
    expect(takeHandoff('nope')).toBeNull();
  });
  it('reads ?handoff once and removes the param without navigating', () => {
    const files = [f('a.csv')];
    const id = putHandoff(files);
    window.history.replaceState(null, '', `/data/csv?handoff=${id}&x=1#h`);
    const onFiles = vi.fn();
    const { rerender } = render(<Probe onFiles={onFiles} />);
    rerender(<Probe onFiles={onFiles} />);
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenCalledWith(files);
    expect(window.location.pathname + window.location.search).toBe(
      '/data/csv?x=1',
    );
    expect(window.location.hash).toBe('#h');
  });
  it('delivers once under StrictMode, after its mount-unmount check', () => {
    const files = [f('a.csv')];
    window.history.replaceState(
      null,
      '',
      `/data/csv?handoff=${putHandoff(files)}`,
    );
    const events: string[] = [];
    function Tool() {
      // A job started by the first (checked) mount is cancelled on unmount.
      useEffect(() => {
        events.push('mount');
        return () => {
          events.push('unmount');
        };
      }, []);
      useHandoffFiles(() => events.push('files'));
      return null;
    }
    render(
      <StrictMode>
        <Tool />
      </StrictMode>,
    );
    expect(events.filter((e) => e === 'files')).toHaveLength(1);
    expect(events.lastIndexOf('files')).toBeGreaterThan(
      events.lastIndexOf('unmount'),
    );
  });

  it('does nothing without the param', () => {
    const onFiles = vi.fn();
    render(<Probe onFiles={onFiles} />);
    expect(onFiles).not.toHaveBeenCalled();
  });
  it('drops a stale param whose files are gone', () => {
    window.history.replaceState(null, '', '/data/csv?handoff=gone');
    const onFiles = vi.fn();
    render(<Probe onFiles={onFiles} />);
    expect(onFiles).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });
});

describe('handoff (text payloads)', () => {
  const text = {
    kind: 'text' as const,
    mime: 'application/json',
    text: '{}',
    sourceTool: 'csv-viewer',
  };
  it('is one-time', () => {
    const id = putHandoff(text);
    expect(takeHandoff(id)).toEqual(text);
    expect(takeHandoff(id)).toBeNull();
  });
  it('expires after five minutes', () => {
    vi.useFakeTimers();
    const id = putHandoff(text);
    vi.advanceTimersByTime(300_001);
    expect(takeHandoff(id)).toBeNull();
  });
  it('keeps at most HANDOFF_MAX entries (oldest evicted)', () => {
    const ids = Array.from({ length: HANDOFF_MAX + 1 }, () => putHandoff(text));
    expect(takeHandoff(ids[0])).toBeNull();
    expect(takeHandoff(ids[HANDOFF_MAX])).not.toBeNull();
  });
  it('refuses oversized text', () => {
    expect(() =>
      putHandoff({ ...text, text: 'x'.repeat(50 * 1024 * 1024 + 1) }),
    ).toThrow(expect.objectContaining({ code: 'TOO_LARGE' }));
  });
  it('measures the text limit in UTF-8 bytes, not UTF-16 units', () => {
    // 26 Mi two-byte characters: under the limit in units, over it in bytes.
    const big = 'é'.repeat(26 * 1024 * 1024);
    expect(() => putHandoff({ ...text, text: big })).toThrow(
      expect.objectContaining({ code: 'TOO_LARGE' }),
    );
    const id = putHandoff({ ...text, text: big.slice(0, 25 * 1024 * 1024) });
    expect(takeHandoff(id)).not.toBeNull();
  });
  it('still carries files', () => {
    const f = new File(['a'], 'a.txt');
    const id = putHandoff({ kind: 'files', files: [f] });
    expect(takeHandoff(id)).toMatchObject({ kind: 'files', files: [f] });
  });

  it('useHandoff(match) takes a matching payload once and strips the param', () => {
    const id = putHandoff({ ...text, meta: { side: 'left' } });
    window.history.replaceState(null, '', `/text/diff?handoff=${id}&a=1`);
    const isLeft = (p: HandoffPayload) =>
      p.kind === 'text' && p.meta?.side === 'left';
    const isRight = (p: HandoffPayload) =>
      p.kind === 'text' && p.meta?.side === 'right';
    // A reader that does not match leaves the payload for the one that does.
    const right = renderHook(() => useHandoff(isRight));
    expect(right.result.current).toBeNull();
    expect(window.location.search).toContain('handoff=');
    const left = renderHook(() => useHandoff(isLeft), {
      wrapper: StrictMode,
    });
    expect(left.result.current).toMatchObject({ text: '{}' });
    expect(window.location.search).toBe('?a=1');
    expect(takeHandoff(id)).toBeNull();
  });

  it('sendTo puts the payload and navigates to the tool route', () => {
    const navigate = vi.fn();
    sendTo(navigate, 'text-diff-checker', text);
    const [to] = navigate.mock.calls[0] as [string];
    const m = /^\/text\/diff\?handoff=(.+)$/.exec(to);
    expect(m).not.toBeNull();
    expect(takeHandoff(m![1])).toEqual(text);
    expect(() => sendTo(navigate, 'no-such-tool', text)).toThrow(
      /no-such-tool/,
    );
  });
});
