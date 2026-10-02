/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { IconFileText } from './icons';
import { EmptyState, ErrorState, LoadingState } from './states';

describe('ErrorState', () => {
  it('is an alert titled by code with the error message', () => {
    render(
      <ErrorState error={new ToolError('ENCRYPTED', 'This PDF is locked.')} />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Password needed');
    expect(alert.textContent).toContain('This PDF is locked.');
  });

  it('falls back to a generic title and runs actions', () => {
    const retry = vi.fn();
    render(
      <ErrorState
        error={new ToolError('UNKNOWN', 'It broke.')}
        actions={[{ label: 'Try again', onClick: retry, variant: 'primary' }]}
      />,
    );
    expect(screen.getByRole('heading').textContent).toBe(
      'Something went wrong',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('LoadingState', () => {
  it('shows a progressbar with the current value', () => {
    render(
      <LoadingState
        label="Rendering pages"
        progress={{ done: 3, total: 10 }}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Rendering pages');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '3',
    );
  });
});

describe('EmptyState', () => {
  it('prop form renders icon, title, description and actions', () => {
    render(
      <EmptyState
        icon={IconFileText}
        title="No documents yet"
        description="Drop a PDF to start."
        actions={<button type="button">Open</button>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'No documents yet' }),
    ).toBeTruthy();
    expect(screen.getByText('Drop a PDF to start.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
  });
});

describe('state semantics (review M12, M25)', () => {
  it('LoadingState is one status region that names its label once', () => {
    render(<LoadingState label="Rendering pages" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe('Rendering pages');
  });

  it('headings take a level', () => {
    render(
      <>
        <EmptyState title="Nothing" headingLevel={2} />
        <ErrorState error={new ToolError('UNKNOWN', 'x')} headingLevel={4} />
      </>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nothing' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { level: 4 })).toBeTruthy();
  });
});
