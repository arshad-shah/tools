/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RedactOptions } from './modes/redact/RedactOptions';
import { ToolbarPanel } from './ToolbarPanel';

describe('ToolbarPanel (backlog P5-E)', () => {
  it('opens the redaction options from the toolbar, by the button', () => {
    render(
      <ToolbarPanel
        layout="standard"
        label="Redaction options"
        text="Options"
        leading={null}
        title="Redaction options"
      >
        <RedactOptions />
      </ToolbarPanel>,
    );
    const button = screen.getByRole('button', { name: 'Redaction options' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen.getByRole('dialog', { name: 'Redaction options' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Text on redactions')).toBeTruthy();
    expect(screen.getByLabelText('Snap to text lines')).toBeTruthy();
  });

  it('touch layouts get 44px buttons and a sheet on phones', () => {
    render(
      <ToolbarPanel
        layout="phone"
        label="Redaction options"
        text="Options"
        leading={null}
        title="Redaction options"
      >
        <RedactOptions />
      </ToolbarPanel>,
    );
    const button = screen.getByRole('button', { name: 'Redaction options' });
    expect(button.className).toContain('h-touch');
    fireEvent.click(button);
    expect(
      screen
        .getByRole('dialog', { name: 'Redaction options' })
        .getAttribute('data-presentation'),
    ).toBe('sheet');
  });
});
