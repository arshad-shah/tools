/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductionUseNotice } from './production-use';

describe('ProductionUseNotice', () => {
  it('says what is safe here, with the default title', () => {
    render(<ProductionUseNotice>Use local tools instead.</ProductionUseNotice>);
    expect(screen.getByText('For development and testing')).toBeTruthy();
    expect(screen.getByText('Use local tools instead.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps the local commands in a closed disclosure', () => {
    render(
      <ProductionUseNotice
        commandsLabel="Run it locally"
        commands={[{ label: 'Random secret', command: 'openssl rand -hex 32' }]}
      >
        Text
      </ProductionUseNotice>,
    );
    const toggle = screen.getByRole('button', { name: 'Run it locally' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('openssl rand -hex 32')).toBeTruthy();
  });
});
