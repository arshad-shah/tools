/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PaneTabs } from './pane-tabs';
import { usePaneTab } from './use-pane-tab';

beforeEach(() => localStorage.clear());

function Demo({ output = 'out', id }: { output?: string; id: string }) {
  const [text, setText] = useState('');
  return (
    <PaneTabs
      id={id}
      label="Demo panes"
      panes={[
        {
          id: 'input',
          label: 'Input',
          content: (
            <textarea
              aria-label="Text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          ),
        },
        {
          id: 'output',
          label: 'Output',
          content: <p>{output}</p>,
          changeKey: output,
        },
      ]}
    />
  );
}

describe('PaneTabs (R41)', () => {
  it('shows one pane at a time and keeps the other mounted', () => {
    render(<Demo id="d1" />);
    const input = screen.getByRole('tabpanel', { name: 'Input' });
    expect(input.hidden).toBe(false);
    const output = document.getElementById(
      screen
        .getByRole('tab', { name: 'Output' })
        .getAttribute('aria-controls')!,
    )!;
    expect(output.hidden).toBe(true);
    // Typed state survives a switch: the hidden pane is still mounted.
    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'kept' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Output' }));
    expect(output.hidden).toBe(false);
    fireEvent.click(screen.getByRole('tab', { name: 'Input' }));
    expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
      'kept',
    );
  });

  it('arrow keys move between tabs (roving focus)', () => {
    render(<Demo id="d2" />);
    const inputTab = screen.getByRole('tab', { name: 'Input' });
    inputTab.focus();
    fireEvent.keyDown(inputTab, { key: 'ArrowRight' });
    const outputTab = screen.getByRole('tab', { name: 'Output' });
    expect(document.activeElement).toBe(outputTab);
    expect(outputTab.getAttribute('aria-selected')).toBe('true');
    expect(inputTab.tabIndex).toBe(-1);
  });

  it('marks a hidden pane that changed, and clears the mark when shown', () => {
    const { rerender } = render(<Demo id="d3" output="a" />);
    rerender(<Demo id="d3" output="b" />);
    const outputTab = screen.getByRole('tab', { name: /Output/ });
    expect(outputTab.textContent).toContain('updated');
    fireEvent.click(outputTab);
    expect(outputTab.textContent).not.toContain('updated');
  });

  it('remembers the last tab per id', () => {
    const { unmount } = render(<Demo id="d4" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Output' }));
    unmount();
    render(<Demo id="d4" />);
    expect(
      screen.getByRole('tab', { name: 'Output' }).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('usePaneTab lets a tool reveal a pane after a run', () => {
    function Runner() {
      const tab = usePaneTab('runner', 'input');
      return (
        <>
          <button type="button" onClick={() => tab.show('output')}>
            Run
          </button>
          <PaneTabs
            id="runner"
            label="Runner panes"
            value={tab.value}
            onValueChange={tab.show}
            panes={[
              { id: 'input', label: 'Input', content: 'in' },
              { id: 'output', label: 'Output', content: 'out' },
            ]}
          />
        </>
      );
    }
    render(<Runner />);
    act(() => screen.getByRole('button', { name: 'Run' }).click());
    expect(
      screen.getByRole('tab', { name: 'Output' }).getAttribute('aria-selected'),
    ).toBe('true');
  });
});
