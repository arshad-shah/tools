/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyNote } from './privacy-note';

describe('PrivacyNote', () => {
  it('local wording', () => {
    const { container } = render(<PrivacyNote variant="local" />);
    expect(container.textContent).toBe('Nothing leaves your browser.');
  });

  it('network wording', () => {
    const { container } = render(<PrivacyNote variant="network" />);
    expect(container.textContent).toBe(
      'Requests go directly from your browser to the URL you enter.',
    );
  });

  it('appends extra words after the statement', () => {
    render(
      <PrivacyNote variant="local">
        Keys are generated on this device.
      </PrivacyNote>,
    );
    expect(screen.getByText('Nothing leaves your browser.')).toBeTruthy();
    expect(screen.getByText('Keys are generated on this device.')).toBeTruthy();
  });

  it('the icon is decorative', () => {
    const { container } = render(<PrivacyNote variant="local" />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
