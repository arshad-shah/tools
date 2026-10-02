/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogRow } from './LogRow';

describe('LogRow', () => {
  it('renders the level badge with its icon', () => {
    const { container } = render(
      <LogRow
        log={{ id: 1, level: 'error', message: 'boom', raw: 'boom' }}
        copied={false}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByText('Error')).toBeTruthy();
    expect(container.querySelector('svg.lucide-circle-alert')).not.toBeNull();
  });
});
