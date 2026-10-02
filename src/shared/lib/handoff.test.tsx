/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, useEffect } from 'react';
import { render } from '@testing-library/react';
import { putHandoff, takeHandoff, useHandoffFiles } from './handoff';

const f = (name: string) => new File(['x'], name);

function Probe({ onFiles }: { onFiles: (files: File[]) => void }) {
  useHandoffFiles(onFiles);
  return null;
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('handoff', () => {
  it('hands files over once', () => {
    const files = [f('a.csv')];
    const id = putHandoff(files);
    expect(takeHandoff(id)).toBe(files);
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
