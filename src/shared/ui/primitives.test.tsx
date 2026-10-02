/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { MetaList } from './meta-list';
import { SegmentedControl } from './segmented-control';
import { StatusDot } from './status-dot';
import { Swatch } from './swatch';

type Theme = 'system' | 'light' | 'dark' | 'auto';

function Themes({ onChange }: { onChange: (v: Theme) => void }) {
  const [value, setValue] = useState<Theme>('system');
  return (
    <SegmentedControl<Theme>
      label="Theme"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'auto', label: 'Auto', disabled: true },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a labelled radiogroup with one tab stop', () => {
    render(<Themes onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
  });

  it('arrows move and select; disabled options are skipped', () => {
    const onChange = vi.fn();
    render(<Themes onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('light');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('dark');
    expect(document.activeElement?.textContent).toBe('Dark');
  });

  it('Home and End jump', () => {
    const onChange = vi.fn();
    render(<Themes onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('dark');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('system');
  });
});

describe('MetaList', () => {
  it('renders N items and N-1 silent decorative separators', () => {
    const { container } = render(
      <MetaList items={['3 pages', '1.2 MB', 'PDF 1.7']} />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    const seps = container.querySelectorAll('[data-separator]');
    expect(seps).toHaveLength(2);
    for (const s of seps) {
      expect(s.getAttribute('aria-hidden')).toBe('true');
      expect(s.textContent).toBe('');
    }
  });

  it('drops empty items, so separators never strand', () => {
    const { container } = render(
      <MetaList
        items={['36 tools', '', null, false, undefined, 'Copyright']}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelectorAll('[data-separator]')).toHaveLength(1);
  });
});

describe('StatusDot', () => {
  it('refuses to render without a label unless decorative', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error a label or decorative is required
    expect(() => render(<StatusDot tone="accent" />)).toThrow(ToolError);
  });
  it('with a label is an image', () => {
    render(<StatusDot tone="accent" label="Filters active" />);
    expect(screen.getByRole('img', { name: 'Filters active' })).toBeTruthy();
  });
  it('decorative is hidden', () => {
    const { container } = render(<StatusDot tone="muted" decorative />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('Swatch', () => {
  it('accepts tokens and validated hex', () => {
    render(
      <>
        <Swatch color="accent" label="Mint" />
        <Swatch color="#1d5fc4" label="Blue" />
      </>,
    );
    expect(
      screen.getByRole('img', { name: 'Blue' }).style.backgroundColor,
    ).toBe('rgb(29, 95, 196)');
    expect(screen.getByRole('img', { name: 'Mint' }).className).toContain(
      'bg-accent',
    );
  });

  it('rejects anything else with INVALID_INPUT', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Swatch color="red" label="Red" />)).toThrow(ToolError);
  });
});

describe('SegmentedControl with a value outside its options', () => {
  it('ArrowRight starts at the first option, ArrowLeft at the last', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Size"
        value="none"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ]}
      />,
    );
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('a');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('c');
  });
});
