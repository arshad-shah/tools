/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dockedBarOpened, useDockedBarOpen } from './docked-bar-state';
import { FloatingDock } from './floating-dock';
import { IconPen, IconType } from './icons';

function Probe() {
  return <span>{useDockedBarOpen() ? 'away' : 'here'}</span>;
}

describe('docked bar state', () => {
  it('the phone dock steps aside while a docked bar is open', () => {
    render(
      <>
        <Probe />
        <FloatingDock
          label="Modes"
          items={[
            { id: 'a', label: 'Fill', icon: IconPen },
            { id: 'b', label: 'Edit', icon: IconType },
          ]}
          value="a"
          onChange={() => {}}
        />
      </>,
    );
    const dock = screen.getByRole('tablist', { name: 'Modes' });
    expect(screen.getByText('here')).toBeTruthy();
    let close = () => {};
    act(() => {
      close = dockedBarOpened();
    });
    expect(screen.getByText('away')).toBeTruthy();
    expect(dock.hasAttribute('inert')).toBe(true);
    act(() => close());
    expect(dock.hasAttribute('inert')).toBe(false);
  });
});
