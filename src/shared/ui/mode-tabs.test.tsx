/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IconFileText,
  IconPen,
  IconScissors,
  IconLock,
  IconSearch,
  IconStar,
  IconTrash,
  IconPlus,
  IconSettings,
} from './icons';
import { ModeTabs, type ModeTabItem } from './mode-tabs';
import { FloatingDock } from './floating-dock';

const ICONS = [
  IconFileText,
  IconPen,
  IconScissors,
  IconLock,
  IconSearch,
  IconStar,
  IconTrash,
  IconPlus,
  IconSettings,
];
const ITEMS: ModeTabItem[] = ICONS.map((icon, i) => ({
  id: `m${i + 1}`,
  label: `Mode ${i + 1}`,
  icon,
  shortcut: String(i + 1),
}));

function Harness({
  items = ITEMS.slice(0, 4),
  onChange,
  maxVisible,
}: {
  items?: ModeTabItem[];
  onChange?: (id: string) => void;
  maxVisible?: number;
}) {
  const [value, setValue] = useState(items[0].id);
  return (
    <ModeTabs
      label="Modes"
      items={items}
      value={value}
      maxVisible={maxVisible}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
    />
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ModeTabs', () => {
  it('is a labelled tablist whose tabs control the mode panel', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Modes' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBe('mode-panel');
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs[1].tabIndex).toBe(-1);
  });

  it('ArrowRight selects the next tab and moves focus to it', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('m2');
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: /Mode 2/ }),
    );
  });

  it('End selects the last tab and Home the first; ArrowLeft wraps', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const first = screen.getAllByRole('tab')[0];
    fireEvent.keyDown(first, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('m4');
    fireEvent.keyDown(screen.getByRole('tab', { name: /Mode 4/ }), {
      key: 'Home',
    });
    expect(onChange).toHaveBeenLastCalledWith('m1');
    fireEvent.keyDown(screen.getByRole('tab', { name: /Mode 1/ }), {
      key: 'ArrowLeft',
    });
    expect(onChange).toHaveBeenLastCalledWith('m4');
  });

  it('puts items past the measured width into a More menu', () => {
    let cb: ResizeObserverCallback = () => {};
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(c: ResizeObserverCallback) {
          cb = c;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    const onChange = vi.fn();
    render(<Harness items={ITEMS} onChange={onChange} />);
    act(() =>
      cb(
        [{ contentRect: { width: 8 * 104 + 88 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      ),
    );
    expect(screen.getAllByRole('tab')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    const item = screen.getByRole('menuitem', { name: /Mode 9/ });
    fireEvent.click(item);
    expect(onChange).toHaveBeenLastCalledWith('m9');
    // The active overflow mode takes the last visible slot.
    expect(
      screen.getByRole('tab', { name: /Mode 9/ }).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('honours an explicit maxVisible', () => {
    render(<Harness items={ITEMS} maxVisible={3} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /More/ })).toBeTruthy();
  });
});

describe('FloatingDock', () => {
  it('renders the same tab names from the same data', () => {
    const onChange = vi.fn();
    render(
      <FloatingDock
        label="Modes"
        items={ITEMS.slice(0, 4)}
        value="m2"
        onChange={onChange}
        size="lg"
      />,
    );
    const names = within(screen.getByRole('tablist', { name: 'Modes' }))
      .getAllByRole('tab')
      .map((t) => t.textContent);
    expect(names).toEqual(['Mode 1', 'Mode 2', 'Mode 3', 'Mode 4']);
    const second = screen.getByRole('tab', { name: 'Mode 2' });
    expect(second.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(second, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('m3');
  });
});
